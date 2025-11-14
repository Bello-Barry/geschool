import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { getSchoolBySubdomain } from '@/lib/utils/school-resolver';

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
  const { supabase } = createClient(request);
  
  // 1. Extraire hostname et sous-domaine
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  
  console.log('[Middleware] Hostname:', hostname, 'Subdomain:', subdomain);
  
  // 2. Gérer sous-domaines réservés
  if (subdomain && RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.next();
  }
  
  // 3. Si domaine racine (ecole-congo.com) - routes publiques
  if (!subdomain || subdomain === hostname.split('.')[0]) {
    const response = NextResponse.next();
    
    // Si route détection école, pas besoin de vérifier
    if (request.nextUrl.pathname === '/api/detect-school') {
      return response;
    }
    
    return response;
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
  
  // 5. Créer réponse avec headers de l'école
  const response = NextResponse.next();
  
  // Injecter headers pour les Server Components
  response.headers.set('x-school-id', school.id);
  response.headers.set('x-school-name', school.name);
  response.headers.set('x-school-subdomain', school.subdomain || '');
  response.headers.set('x-school-color', school.primary_color || '#3B82F6');
  
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
    response.headers.set('x-user-id', session.user.id);
    response.headers.set('x-user-role', user.role);
  }
  
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