import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeAuthCookie, getAuthCookieName } from "@/lib/utils/session-resolver";

function extractSlugFromHeaders(headersList: Headers): string | null {
  // Méthode 1: header x-school-subdomain (défini par le middleware)
  const slug = headersList.get("x-school-subdomain");
  if (slug) return slug;

  // Méthode 2: extraire depuis l'URL (fallback quand middleware ne compile pas)
  const url = headersList.get("next-url") || headersList.get("x-url") || "";
  const match = url.match(/^\/([^\/]+)\/(admin|teacher|parent|student)/);
  if (match?.[1]) return match[1];

  return null;
}

function extractSchoolIdFromHeaders(headersList: Headers): string | null {
  const id = headersList.get("x-school-id");
  if (id) return id;
  return null;
}

export async function getAuthUser(slug?: string) {
  const supabaseAdmin = createAdminClient();
  const headersList = await headers();
  let schoolId = extractSchoolIdFromHeaders(headersList);

  let userId = headersList.get("x-user-id");

  if (!userId) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id ?? null;
  }

  if (!userId) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(getAuthCookieName());
    const decoded = decodeAuthCookie(authCookie?.value || '');
    userId = decoded?.user?.id ?? null;
  }

  if (!userId) return null;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("role, school_id")
    .eq("id", userId)
    .single();

  if (!user) return null;

  // Si schoolId n'a pas été défini par le middleware, le dériver du slug dans l'URL
  if (!schoolId) {
    const urlSlug = slug || extractSlugFromHeaders(headersList);
    if (urlSlug) {
      const { data: school } = await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("subdomain", urlSlug)
        .single();
      schoolId = school?.id || null;
    }
  }

  // En dernier recours, utiliser le school_id de l'utilisateur
  if (!schoolId) {
    schoolId = user.school_id;
  }

  // Vérification de sécurité : si on est sur une route /[ecole]/...,
  // s'assurer que l'utilisateur appartient bien à cette école
  if (schoolId && user.school_id !== schoolId) {
    return null;
  }

  return { userId, schoolId: schoolId || user.school_id, role: user.role };
}

export function requireRole(allowedRoles: string[]) {
  return async function checkRole() {
    const auth = await getAuthUser();
    if (!auth || !allowedRoles.includes(auth.role)) {
      redirect("/login");
    }
    return auth;
  };
}

export async function getSchoolHeaders() {
  const headersList = await headers();
  return {
    schoolId: headersList.get("x-school-id"),
    schoolName: headersList.get("x-school-name"),
    schoolColor: headersList.get("x-school-color"),
  };
}
