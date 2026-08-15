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
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = await verifySuperAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('schools')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'École supprimée' });
}
