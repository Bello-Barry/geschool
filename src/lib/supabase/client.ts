import { createBrowserClient } from '@supabase/ssr';

/**
 * Retourne le domaine racine pour les cookies (avec le point qui permet le partage entre sous-domaines).
 * Ex: localhost en dev → ".localhost" | geschool.cd en prod → ".geschool.cd"
 */
function getCookieDomain(): string | undefined {
  // En développement local (localhost / 127.0.0.1), pas de domain attribute
  // Les navigateurs modernes partagent les cookies *.localhost sans domain explicite.
  // On retourne undefined pour laisser le navigateur gérer.
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined;
  // Sur un sous-domaine (monecole.localhost ou monecole.geschool.cd)
  // on récupère le domaine parent depuis ROOT_DOMAIN
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
  const baseDomain = rootDomain.split(':')[0]; // retire le port s'il y en a un
  if (!baseDomain || baseDomain === 'localhost') return undefined;
  return `.${baseDomain}`; // point initial = partage sur tous les sous-domaines
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieDomain = getCookieDomain();

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    cookieDomain
      ? {
          cookieOptions: {
            domain: cookieDomain,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
          },
        }
      : undefined
  );
}
