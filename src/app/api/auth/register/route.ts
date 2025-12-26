
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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

    const { firstName, lastName, email, password, schoolName, subdomain } = validation.data;
    const supabase = await createClient();

    // Check if school with subdomain already exists
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingSchool) {
      return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé' }, { status: 409 });
    }

    // Create the school
    const { data: newSchool, error: createSchoolError } = await supabase
      .from('schools')
      .insert({ name: schoolName, subdomain, code: subdomain.toUpperCase() })
      .select('id')
      .single();

    if (createSchoolError || !newSchool) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'école' }, { status: 500 });
    }

    // Sign up the user
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (signUpError || !user) {
      // If user creation fails, we should probably delete the school we just created
      await supabase.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({ error: signUpError?.message || 'Erreur lors de la création de l\'utilisateur' }, { status: 500 });
    }

    // Insert user profile
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
      // If user profile insertion fails, we should delete the user and the school
      await supabase.auth.admin.deleteUser(user.id);
      await supabase.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({ error: 'Erreur lors de la création du profil utilisateur' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Compte créé avec succès' }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
