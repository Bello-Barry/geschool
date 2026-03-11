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

    const { firstName, lastName, email: rawEmail, password, schoolName, subdomain } = validation.data;
    const email = rawEmail.toLowerCase();
    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existingUser, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      console.error('Erreur lors de la vérification de l\'email:', emailError);
      return NextResponse.json({ error: 'Erreur serveur lors de la vérification de l\'email' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    // Check if school with subdomain already exists
    const { data: existingSchool, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle(); // Utilise maybeSingle() au lieu de single()

    if (schoolError) {
      console.error('Erreur lors de la vérification du sous-domaine:', schoolError);
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
        code: `${schoolCode}-${Math.floor(1000 + Math.random() * 9000)}`
      })
      .select('id')
      .single();

    if (createSchoolError || !newSchool) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'école' }, { status: 500 });
    }

    // Create the user in Auth
    const { data: { user }, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (signUpError || !user) {
      console.error('Erreur création auth user:', signUpError);
      // If user creation fails, we should probably delete the school we just created
      await supabase.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({ error: signUpError?.message || 'Erreur lors de la création de l\'utilisateur' }, { status: 500 });
    }

    // Insert user profile
    const userProfile = {
      id: user.id,
      school_id: newSchool.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: 'super_admin',
      is_active: true
    };

    console.log('Tentative d\'insertion du profil utilisateur (upsert):', userProfile);

    const { error: insertUserError } = await supabase
      .from('users')
      .upsert(userProfile, { onConflict: 'id' });

    if (insertUserError) {
      console.error('Erreur détaillée insertion profil utilisateur:', {
        error: insertUserError,
        code: insertUserError.code,
        message: insertUserError.message,
        details: insertUserError.details,
        hint: insertUserError.hint
      });
      // If user profile insertion fails, we should delete the user and the school
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
