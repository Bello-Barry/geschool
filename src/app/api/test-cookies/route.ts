import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    let clientResult = 'ok';
    let clientError = null;
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      clientResult = session ? 'has_session' : 'no_session';
    } catch (e: unknown) {
      clientError = e instanceof Error ? e.message : String(e);
    }
    
    return NextResponse.json({
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      clientResult,
      clientError,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
