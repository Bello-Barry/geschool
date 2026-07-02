import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { error, data } = await supabase.auth.signInWithPassword({
      email: 'barry2@geschool.com',
      password: 'password123',
    });
    
    return NextResponse.json({
      success: !error,
      error: error?.message || null,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split('\n').slice(0, 3).join('\n') : null,
    }, { status: 500 });
  }
}
