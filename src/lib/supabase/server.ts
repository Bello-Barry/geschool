import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Retourne le domaine de cookie côté serveur.
 * En dev local (localhost), on ne force pas de domain pour laisser le navigateur gérer.
 * En production, on renvoie ".geschool.cd" (ou le domaine racine configuré).
 */
function getServerCookieDomain(): string | undefined {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
  const baseDomain = rootDomain.split(':')[0]; // retire le port
  if (!baseDomain || baseDomain === 'localhost' || baseDomain === '127.0.0.1') {
    return undefined; // pas de domain en local → le navigateur gère
  }
  return `.${baseDomain}`;
}

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieDomain = getServerCookieDomain();
  const cookieOptions = cookieDomain
    ? { domain: cookieDomain, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' }
    : undefined;

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      ...(cookieOptions ? { cookieOptions } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options, ...(cookieDomain ? { domain: cookieDomain } : {}) })
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
