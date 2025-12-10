import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const registerSchema = z.object({
  schoolName: z.string().min(3, "Le nom de l'école est requis."),
  subdomain: z.string().min(3, "Le sous-domaine est requis.").regex(/^[a-z0-9-]+$/, 'Le sous-domaine ne peut contenir que des lettres minuscules, des chiffres et des tirets.'),
  email: z.string().email("L'email est invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  firstName: z.string().min(2, "Le prénom est requis."),
  lastName: z.string().min(2, "Le nom est requis."),
});

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const supabaseAdmin = createAdminClient();
  const body = await request.json();

  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { schoolName, subdomain, email, password, firstName, lastName } = result.data;

  try {
    // Étape 1 : Vérifier si le sous-domaine existe déjà
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingSchool) {
      return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé.' }, { status: 409 });
    }

    // Début de la "transaction" manuelle
    let newAuthUser = null;
    let newSchool = null;

    // Étape 2 : Créer l'école
    const { data: createdSchool, error: schoolCreationError } = await supabase
      .from('schools')
      .insert({ name: schoolName, subdomain, code: subdomain.toUpperCase() })
      .select()
      .single();

    if (schoolCreationError) throw new Error(schoolCreationError.message);
    newSchool = createdSchool;

    // Étape 3 : Créer l'utilisateur dans le service d'authentification
    // Supabase renverra une erreur si l'email existe déjà.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // L'utilisateur est confirmé directement
    });

    if (authError) {
        // Si l'erreur est que l'utilisateur existe déjà, on renvoie une erreur claire.
        if (authError.message.includes('Email address already in use')) {
            return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 });
        }
        // Pour toute autre erreur d'authentification, on la lance.
        throw new Error(authError.message);
    }

    if (!authData.user) throw new Error("La création de l'utilisateur a échoué.");
    newAuthUser = authData.user;

    // Étape 4 : Créer l'enregistrement dans la table publique 'users'
    const { error: userProfileError } = await supabase
      .from('users')
      .insert({
        id: newAuthUser.id,
        school_id: newSchool.id,
        email: email,
        role: 'admin_school',
        first_name: firstName,
        last_name: lastName,
      });

    if (userProfileError) throw new Error(userProfileError.message);

    // Si tout réussit
    return NextResponse.json({ message: 'École et administrateur créés avec succès.', school: newSchool }, { status: 201 });

  } catch (error: any) {
    console.error('Erreur lors de l\'inscription:', error);
    // Logique de compensation (Rollback manuel)
    // Ici, on pourrait ajouter une logique pour supprimer l'école si elle a été créée avant l'échec.
    return NextResponse.json({ error: `Une erreur est survenue: ${error.message}` }, { status: 500 });
  }
}
