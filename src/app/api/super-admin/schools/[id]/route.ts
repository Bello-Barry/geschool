import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodeAuthCookie, getAuthCookieName } from '@/lib/utils/session-resolver';
import { cookies } from 'next/headers';

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const authCookieName = getAuthCookieName();
  const authCookie = cookieStore.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value ?? '');

  if (!session) return null;

  const supabaseAdmin = createAdminClient();
  const { data: currentUser } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  return currentUser?.role === 'super_admin' ? supabaseAdmin : null;
}

// PATCH /api/super-admin/schools/[id] — toggle active or update school
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = await verifySuperAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const { error } = await supabaseAdmin
    .from('schools')
    .update(body)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'École mise à jour' });
}

// DELETE /api/super-admin/schools/[id] — permanently delete school
// Suppression en cascade manuelle (ordre topologique) car le schéma
// n'a pas de ON DELETE CASCADE sur les FK school_id → schools.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = await verifySuperAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;

  // Ordre : les tables enfants d'abord (celles dont les FK vers
  // d'autres tables enfants sont RESTRICT), l'école en dernier.
  // Les tables de jointure (student_parents, assignment_completions,
  // td_attendance, messages, participants...) sont purgées via les
  // ON DELETE CASCADE déjà présentes dans le schéma.
  const tables: { table: string; idColumn?: string }[] = [
    { table: 'attendance' },
    { table: 'grades' },
    { table: 'report_cards' },
    { table: 'payments' },
    { table: 'tuition_fees' },
    { table: 'td_sessions' },
    { table: 'assignments' },
    { table: 'courses' },
    { table: 'schedule_slots' },
    { table: 'conversations' },
    { table: 'programmes' },
    { table: 'teacher_subjects' },
    { table: 'students' },
    { table: 'teachers' },
    { table: 'parents' },
    { table: 'classes' },
    { table: 'subjects' },
    { table: 'terms' },
    { table: 'academic_years' },
    { table: 'notifications' },
    { table: 'announcements' },
    { table: 'users' },
    { table: 'monthly_dues' },
  ];

  for (const { table } of tables) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('school_id', id);
    if (error) {
      return NextResponse.json(
        { error: `Échec de purge de ${table} : ${error.message}` },
        { status: 500 }
      );
    }
  }

  const { error } = await supabaseAdmin
    .from('schools')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'École supprimée' });
}
