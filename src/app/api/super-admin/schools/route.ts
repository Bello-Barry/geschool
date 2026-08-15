import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodeAuthCookie, getAuthCookieName } from '@/lib/utils/session-resolver';
import { cookies } from 'next/headers';

const createSchoolSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  schoolName: z.string().min(1),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  primaryColor: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Super Admin privileges
    const cookieStore = await cookies();
    const authCookieName = getAuthCookieName();
    const authCookie = cookieStore.get(authCookieName);
    const session = decodeAuthCookie(authCookie?.value ?? "");

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }

    // 2. Validate request
    const body = await request.json();
    const validation = createSchoolSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { firstName, lastName, email, password, schoolName, subdomain, primaryColor } = validation.data;

    // 3. Check if school with subdomain already exists
    const { data: existingSchool, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (schoolError) {
      return NextResponse.json({ error: 'Erreur serveur lors de la vérification du sous-domaine' }, { status: 500 });
    }

    if (existingSchool) {
      return NextResponse.json({ error: 'Ce sous-domaine est déjà utilisé' }, { status: 409 });
    }

    // 4. Create the school
    const code = subdomain.toUpperCase();
    const { data: newSchool, error: createSchoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: schoolName,
        subdomain,
        code,
        primary_color: primaryColor || '#4F46E5',
        is_active: true
      })
      .select('id')
      .single();

    if (createSchoolError || !newSchool) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'école' }, { status: 500 });
    }

    // 5. Create admin user
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (signUpError || !user) {
      await supabaseAdmin.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({ error: signUpError?.message || 'Erreur lors de la création de l\'utilisateur' }, { status: 500 });
    }

    // 6. Insert user profile
    const { error: insertUserError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        school_id: newSchool.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'admin_school',
      });

    if (insertUserError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      await supabaseAdmin.from('schools').delete().eq('id', newSchool.id);
      return NextResponse.json({ error: 'Erreur lors de la création du profil utilisateur' }, { status: 500 });
    }

    // Note: We DO NOT log them in, because the super admin is the one performing this action!
    return NextResponse.json({ message: 'École et compte admin créés avec succès' }, { status: 201 });

  } catch (error) {
    console.error('Super Admin Create School API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
