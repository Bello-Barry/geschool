import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  schoolName: z.string().min(1),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { firstName, lastName, schoolName, subdomain, password } = validation.data;
    const email = validation.data.email.trim().toLowerCase();
    const supabase = createAdminClient();

    console.log('Début de l\'inscription pour:', { email, schoolName, subdomain });

    // Check if school with subdomain already exists
    const { data: existingSchool, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (schoolError) {
      console.error('Erreur lors de la vérification du sous-domaine:', {
        message: schoolError.message,
        code: schoolError.code,
        details: schoolError.details,
        hint: schoolError.hint
      });
      return NextResponse.json({ error: 'Erreur serveur lors de la vérification du sous-domaine' }, { status: 500 });
    }

    if (existingSchool) {
      return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé' }, { status: 409 });
    }

    // Create the school
    const schoolCode = subdomain.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    const { data: newSchool, error: createSchoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName,
        subdomain,
        email, // Ajout de l'email de l'établissement
        code: `${schoolCode}-${Math.floor(1000 + Math.random() * 9000)}`
      })
      .select('id')
      .single();

    if (createSchoolError || !newSchool) {
      console.error('Erreur lors de la création de l\'école:', {
        message: createSchoolError?.message,
        code: createSchoolError?.code,
        details: createSchoolError?.details,
        hint: createSchoolError?.hint
      });
      return NextResponse.json({ error: 'Erreur lors de la création de l\'école' }, { status: 500 });
    }

    // Create the Auth user using admin client to ensure immediate confirmation
    const { data: { user }, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createUserError || !user) {
      console.error('Erreur lors de la création de l\'utilisateur Auth:', {
        message: createUserError?.message,
        code: createUserError?.code,
        details: createUserError?.details,
        hint: createUserError?.hint
      });
      // Cleanup: delete the school
      await supabase.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({ error: createUserError?.message || 'Erreur lors de la création de l\'utilisateur' }, { status: 500 });
    }

    // Insert user profile (table 'users')
    const { error: insertUserError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        school_id: newSchool.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'super_admin',
      });

    if (insertUserError) {
      console.error('Erreur lors de la création du profil utilisateur dans la table "users":', {
        message: insertUserError.message,
        code: insertUserError.code,
        details: insertUserError.details,
        hint: insertUserError.hint
      });
      // Cleanup: delete the user and the school
      await supabase.auth.admin.deleteUser(user.id);
      await supabase.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({
        error: 'Erreur lors de la création du profil utilisateur',
        details: insertUserError.message
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Compte créé avec succès' }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
      }
