import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodeAuthCookie, getAuthCookieName } from '@/lib/utils/session-resolver';

function extractSchoolSlug(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0] as string;
  const reserved = ['login', 'register', 'reset-password', 'set-password', 'verify-email', 'school-not-found', 'api', '_next'];
  if (reserved.includes(first)) return null;
  if (['admin', 'teacher', 'parent', 'student'].includes(first)) return null;
  return first;
}

function getRoleDashboard(role: string): string {
  if (role === 'super_admin' || role === 'admin_school') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/student';
}

async function resolveUserSchoolSubdomain(userId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('school_id')
      .eq('id', userId)
      .maybeSingle();
    if (!user?.school_id) return null;
    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('subdomain')
      .eq('id', user.school_id)
      .maybeSingle();
    return school?.subdomain || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const schoolSlug = extractSchoolSlug(pathname);

  console.log(`[Middleware] path="${pathname}" → slug="${schoolSlug}"`);

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err) {
    console.error('[Middleware] createAdminClient failed:', err);
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);

  // Résoudre l'école depuis le slug dans le chemin
  if (schoolSlug) {
    const { data: school } = await supabaseAdmin
      .from('schools')
      .select('id, name, subdomain, primary_color')
      .eq('subdomain', schoolSlug)
      .maybeSingle();

    if (school) {
      requestHeaders.set('x-school-id', school.id);
      requestHeaders.set('x-school-name', school.name);
      requestHeaders.set('x-school-subdomain', school.subdomain || '');
      requestHeaders.set('x-school-color', school.primary_color || '#3B82F6');
    }
  }

  // Auth : décoder la session depuis le cookie
  const authCookieName = getAuthCookieName();
  const authCookie = request.cookies.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value || '');

  if (session) {
    requestHeaders.set('x-user-id', session.user.id);

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role, school_id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (user) {
      requestHeaders.set('x-user-role', user.role);

      // Rediriger depuis / et /login vers le dashboard de l'utilisateur
      if (pathname === '/' || pathname === '/login') {
        const rolePath = getRoleDashboard(user.role);

        if (schoolSlug) {
          return NextResponse.redirect(new URL(`/${schoolSlug}${rolePath}`, request.url));
        }

        const userSlug = await resolveUserSchoolSubdomain(session.user.id);
        if (userSlug) {
          return NextResponse.redirect(new URL(`/${userSlug}${rolePath}`, request.url));
        }
      }
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
