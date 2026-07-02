import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from 'next/headers';

export async function GET(_request: NextRequest) {
  const results: Record<string, any> = {};

  try {
    const h = await headers();
    results.headers = {
      'x-school-id': h.get('x-school-id'),
      'x-user-id': h.get('x-user-id'),
      'x-user-role': h.get('x-user-role'),
      host: h.get('host'),
      cookie: h.get('cookie')?.substring(0, 100) + '...',
    };
  } catch (e: any) { results.headers_error = e.message; }

  try {
    const c = await cookies();
    const all = c.getAll();
    results.cookies = all.map(c => c.name + '=' + c.value.substring(0, 30) + '...');
    const authCookie = c.get('sb-wvxahcvyejsxmlrirhdr-auth-token');
    results.has_auth_cookie = !!authCookie;
    results.auth_cookie_prefix = authCookie?.value?.substring(0, 20);
  } catch (e: any) { results.cookies_error = e.message; }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    results.getSession = { has_session: !!data?.session, user_id: data?.session?.user?.id, error: error?.message };
  } catch (e: any) { results.getSession_error = e.message; }

  return NextResponse.json(results);
}
