import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { getDashboardPath } from '@/lib/utils/dashboard-paths';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/school-not-found',
  '/api/detect-school',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/set-password',
];

const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'cdn', 'static', 'app'];

function isPublicPath(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

function withSupabaseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
}

export async function middleware(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createClient(request);
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = isPublicPath(pathname);
  const requestHeaders = new Headers(request.headers);

  if (subdomain && RESERVED_SUBDOMAINS.includes(subdomain)) {
    return supabaseResponse;
  }

  if (!subdomain) {
    const schoolFromQuery = request.nextUrl.searchParams.get('school');

    if (isPublicRoute && pathname === '/login' && schoolFromQuery) {
      const { data: school } = await supabase
        .from('schools')
        .select('id, name, subdomain, primary_color')
        .eq('subdomain', schoolFromQuery)
        .maybeSingle();

      if (school) {
        requestHeaders.set('x-school-id', school.id);
        requestHeaders.set('x-school-name', school.name);
        requestHeaders.set('x-school-subdomain', school.subdomain || '');
        requestHeaders.set('x-school-color', school.primary_color || '#3B82F6');
      }
    }

    // If already logged in on root domain, always redirect to role dashboard.
    if (pathname === '/' || pathname === '/login') {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (user?.role) {
          return NextResponse.redirect(new URL(getDashboardPath(user.role), request.url));
        }
      }
    }

    if (!isPublicRoute) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      const { data: user } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('id', session.user.id)
        .single();

      if (!user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'invalid_user');
        return NextResponse.redirect(loginUrl);
      }

      const { data: school } = await supabase
        .from('schools')
        .select('id, name, subdomain, primary_color')
        .eq('id', user.school_id)
        .single();

      if (!school) {
        return NextResponse.redirect(new URL('/school-not-found', request.url));
      }

      requestHeaders.set('x-school-id', school.id);
      requestHeaders.set('x-school-name', school.name);
      requestHeaders.set('x-school-subdomain', school.subdomain || '');
      requestHeaders.set('x-school-color', school.primary_color || '#3B82F6');
      requestHeaders.set('x-user-id', session.user.id);
      requestHeaders.set('x-user-role', user.role);

      const dashboardPath = getDashboardPath(user.role);
      if (pathname === '/') {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      if (pathname.startsWith('/admin') && user.role !== 'admin_school' && user.role !== 'super_admin') {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      if (pathname.startsWith('/teacher') && user.role !== 'teacher') {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      if (pathname.startsWith('/parent') && user.role !== 'parent') {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    withSupabaseCookies(response, supabaseResponse);
    if (requestHeaders.get('x-school-id')) {
      response.headers.set('x-school-id', requestHeaders.get('x-school-id') || '');
      response.headers.set('x-school-name', requestHeaders.get('x-school-name') || '');
    }
    return response;
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, subdomain, primary_color')
    .eq('subdomain', subdomain)
    .single();

  if (!school) {
    const url = new URL('/school-not-found', request.url);
    url.searchParams.set('subdomain', subdomain);
    return NextResponse.redirect(url);
  }

  requestHeaders.set('x-school-id', school.id);
  requestHeaders.set('x-school-name', school.name);
  requestHeaders.set('x-school-subdomain', school.subdomain || '');
  requestHeaders.set('x-school-color', school.primary_color || '#3B82F6');

  // If already logged in on school host, do not stay on landing/login.
  if (pathname === '/' || pathname === '/login') {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const { data: user } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('id', session.user.id)
        .single();

      if (user && user.school_id === school.id) {
        return NextResponse.redirect(new URL(getDashboardPath(user.role), request.url));
      }
    }
  }

  if (!isPublicRoute) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: user } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', session.user.id)
      .single();

    if (!user || user.school_id !== school.id) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'invalid_school');
      return NextResponse.redirect(loginUrl);
    }

    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-role', user.role);

    const dashboardPath = getDashboardPath(user.role);
    if (pathname === '/') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    if (pathname.startsWith('/admin') && user.role !== 'admin_school' && user.role !== 'super_admin') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    if (pathname.startsWith('/teacher') && user.role !== 'teacher') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    if (pathname.startsWith('/parent') && user.role !== 'parent') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  withSupabaseCookies(response, supabaseResponse);
  response.headers.set('x-school-id', school.id);
  response.headers.set('x-school-name', school.name);
  return response;
}

function extractSubdomain(hostname: string): string | null {
  const hostWithoutPort = hostname.split(':')[0] || '';
  const parts = hostWithoutPort.split('.');

  if (parts.length <= 1 || parts.includes('localhost') || parts.includes('127.0.0.1')) {
    if (parts.length > 1 && (parts.includes('localhost') || parts.includes('127.0.0.1'))) {
      return parts[0] || null;
    }
    return null;
  }

  if (hostWithoutPort.endsWith('.vercel.app')) {
    return null;
  }

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
