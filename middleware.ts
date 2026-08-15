import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeAuthCookie, getAuthCookieName } from '@/lib/utils/session-resolver';

function extractSchoolSlug(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0] as string;
  const reserved = ['login', 'register', 'reset-password', 'set-password', 'verify-email', 'school-not-found', 'api', '_next', 'super-admin'];
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

async function getCachedSchool(subdomain: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const url = new URL(`${supabaseUrl}/rest/v1/schools`);
    url.searchParams.set('subdomain', `eq.${subdomain}`);
    url.searchParams.set('select', 'id,name,subdomain,primary_color');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 3600 } // Cache pour 1 heure
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch (error) {
    console.error('[Middleware] Failed to fetch school:', error);
    return null;
  }
}

async function getCachedSchoolById(id: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const url = new URL(`${supabaseUrl}/rest/v1/schools`);
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('select', 'subdomain');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 3600 }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.subdomain || null;
  } catch (error) {
    console.error('[Middleware] Failed to fetch school by id:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const schoolSlug = extractSchoolSlug(pathname);
  const requestHeaders = new Headers(request.headers);

  // Résoudre l'école depuis le slug dans le chemin (mis en cache)
  if (schoolSlug) {
    const school = await getCachedSchool(schoolSlug);
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

  if (session && session.user.app_metadata) {
    const userId = session.user.id;
    const role = session.user.app_metadata.role;
    const schoolId = session.user.app_metadata.school_id;

    requestHeaders.set('x-user-id', userId);

    if (role) {
      requestHeaders.set('x-user-role', role);

      // Pour les routes sans slug (API, etc.), dériver l'école depuis l'utilisateur
      if (!schoolSlug && schoolId) {
        requestHeaders.set('x-school-id', schoolId);
      }

      // Rediriger depuis / et /login vers le dashboard de l'utilisateur
      if (pathname === '/' || pathname === '/login') {
        const rolePath = getRoleDashboard(role);

        if (schoolSlug) {
          return NextResponse.redirect(new URL(`/${schoolSlug}${rolePath}`, request.url));
        }

        if (schoolId) {
          const userSlug = await getCachedSchoolById(schoolId);
          if (userSlug) {
            return NextResponse.redirect(new URL(`/${userSlug}${rolePath}`, request.url));
          }
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
