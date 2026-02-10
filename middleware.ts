import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { getSchoolBySubdomain } from '@/lib/school';
import { getDashboardPath } from '@/lib/utils/dashboard-paths';

// Routes publiques (n'ont pas besoin d'authentification)
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

// Sous-domaines réservés
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'cdn', 'static', 'app'];

export async function middleware(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createClient(request);
  
  // 1. Extraire hostname et sous-domaine
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  
  console.log('[Middleware] Hostname:', hostname, 'Subdomain:', subdomain);
  
  // 2. Gérer sous-domaines réservés
  if (subdomain && RESERVED_SUBDOMAINS.includes(subdomain)) {
    return supabaseResponse;
  }
  
  // 3. Si domaine racine (ecole-congo.com) - routes publiques
  if (!subdomain || subdomain === hostname.split('.')[0]) {
    // Si route détection école, pas besoin de vérifier
    if (request.nextUrl.pathname === '/api/detect-school') {
      return supabaseResponse;
    }
    
    return supabaseResponse;
  }
  
  // 4. Vérifier que le sous-domaine correspond à une école active
  const school = await getSchoolBySubdomain(subdomain as string);
  
  if (!school) {
    // Rediriger vers page d'erreur si école introuvable
    const url = new URL('/school-not-found', request.url);
    url.searchParams.set('subdomain', subdomain);
    return NextResponse.redirect(url);
  }
  
  console.log('[Middleware] School found:', school.name);
  
  // Préparez les nouveaux headers pour la requête
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-school-id', school.id);
  requestHeaders.set('x-school-name', school.name);
  requestHeaders.set('x-school-subdomain', school.subdomain || '');
  requestHeaders.set('x-school-color', school.primary_color || '#3B82F6');
  
  // 6. Vérifier authentification pour routes protégées
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + '/')
  );
  
  if (!isPublicRoute) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Rediriger vers login avec retour à la page demandée
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Vérifier que l'utilisateur appartient bien à cette école
    const { data: user } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', session.user.id)
      .single();
    
    if (!user || user.school_id !== school.id) {
      // Accès refusé - rediriger vers login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'invalid_school');
      return NextResponse.redirect(loginUrl);
    }
    
    // Injecter user_id dans les headers pour RLS
    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-role', user.role);

    // Redirection en fonction du rôle
    const { pathname } = request.nextUrl;
    const userRole = user.role;
    const dashboardPath = getDashboardPath(userRole);

    // Si à la racine après login, rediriger vers le bon dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    // Sécuriser les dashboards
    if (pathname.startsWith('/admin') && userRole !== 'admin_school' && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    if (pathname.startsWith('/teacher') && userRole !== 'teacher') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    if (pathname.startsWith('/parent') && userRole !== 'parent') {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }
  
  // Créez une nouvelle réponse avec les headers de requête mis à jour
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Copiez les cookies de la réponse supabase (pour le rafraîchissement de session)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });

  // Ajoutez également les headers à la réponse pour que le client puisse les voir si besoin
  response.headers.set('x-school-id', school.id);
  response.headers.set('x-school-name', school.name);

  return response;
}

function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  
  // localhost ou IP
  if (parts.length <= 1 || parts.includes('localhost')) {
    return null;
  }
  
  // En production: lycee-sassou.ecole-congo.com -> lycee-sassou
  // En dev: lycee-sassou.localhost:3000 -> lycee-sassou
  const subdomain = parts[0] || null;
  
  // Ignorer www et autres sous-domaines réservés
  if (subdomain && RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }
  
  return subdomain;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};