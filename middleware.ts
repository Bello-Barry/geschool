import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodeAuthCookie, getAuthCookieName } from '@/lib/utils/session-resolver';

// Sous-domaines réservés
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'cdn', 'static', 'app'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  console.log(`[Middleware] host="${hostname}" → subdomain="${subdomain}" | path="${request.nextUrl.pathname}"`);

  // Gérer sous-domaines réservés ou pas de sous-domaine
  if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.next();
  }

  // Client admin (import statique — plus fiable que le dynamic import en Edge Runtime)
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err) {
    console.error('[Middleware] createAdminClient failed:', err);
    return NextResponse.next();
  }

  // Vérifier que le sous-domaine correspond à une école active
  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('subdomain', subdomain)
    .maybeSingle(); // maybeSingle() : ne lève pas d'erreur si 0 résultat (contrairement à single())

  console.log(`[Middleware] school query for "${subdomain}":`, {
    found: !!school,
    schoolId: school?.id,
    error: schoolError?.message,
  });

  if (schoolError) {
    console.error('[Middleware] Supabase query error:', schoolError);
    // En cas d'erreur DB, on laisse passer plutôt que de bloquer l'utilisateur
    return NextResponse.next();
  }

  if (!school) {
    console.warn(`[Middleware] No school found for subdomain="${subdomain}" — redirecting to /school-not-found`);
    const url = new URL('/school-not-found', request.url);
    url.searchParams.set('subdomain', subdomain);
    return NextResponse.redirect(url);
  }

  // Créer une réponse avec les headers de l'école
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-school-id', school.id);
  requestHeaders.set('x-school-name', school.name);
  requestHeaders.set('x-school-subdomain', school.subdomain || '');
  requestHeaders.set('x-school-color', school.primary_color || '#3B82F6');

  // Lire la session directement depuis le cookie (contourne le bug getSession)
  const authCookieName = getAuthCookieName();
  const authCookie = request.cookies.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value || '');

  console.log(`[Middleware] auth cookie "${authCookieName}":`, {
    cookieFound: !!authCookie,
    sessionDecoded: !!session,
    userId: session?.user?.id,
  });

  if (session) {
    requestHeaders.set('x-user-id', session.user.id);
    
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userError) {
      console.error('[Middleware] User query error:', userError);
    }

    if (user) {
      requestHeaders.set('x-user-role', user.role);
      console.log(`[Middleware] User role="${user.role}" for userId="${session.user.id}"`);
      
      if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login') {
        const dashboardPath = user.role === 'super_admin' || user.role === 'admin_school' ? '/admin'
          : user.role === 'teacher' ? '/teacher'
          : user.role === 'parent' ? '/parent'
          : '/student';
        console.log(`[Middleware] Redirecting authenticated user to "${dashboardPath}"`);
        return NextResponse.redirect(new URL(dashboardPath, request.url));
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

function extractSubdomain(hostname: string): string | null {
  const hostnameWithoutPort = hostname.split(':')[0] || '';
  const parts = hostnameWithoutPort.split('.');

  if (parts.length === 1) {
    return null;
  }

  // format sub.localhost ou sub.127.0.0.1
  if (parts[parts.length - 1] === 'localhost' || parts[parts.length - 1] === '127') {
    const subdomain = parts[0] || null;
    if (!subdomain || subdomain === 'localhost' || subdomain === '127') {
      return null;
    }
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return null;
    }
    return subdomain;
  }

  // En production: subdomain.domain.tld
  if (parts.length <= 2) {
    return null;
  }

  const subdomain = parts[0] || null;
  if (subdomain && RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
