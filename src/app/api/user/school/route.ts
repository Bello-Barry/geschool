import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: user } = await adminClient
      .from('users')
      .select('role, school_id, schools(subdomain)')
      .eq('id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const school = user.schools as unknown as { subdomain: string } | undefined;
    if (!school) {
      return NextResponse.json({ error: 'École non trouvée' }, { status: 404 });
    }

    const rolePath = user.role === 'super_admin' || user.role === 'admin_school' ? '/admin' : `/${user.role}`;

    return NextResponse.json({
      slug: school.subdomain,
      role: user.role,
      rolePath,
    });
  } catch (error) {
    console.error('Error getting user school:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
