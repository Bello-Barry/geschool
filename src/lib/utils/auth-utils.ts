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
    .select("role, school_id, is_active")
    .eq("id", userId)
    .single();

  if (!user) return null;

  if (user.is_active === false) return null;

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

export async function requireTdManager(sessionId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();
  if (!user) return { ok: false as const, status: 404, error: "User not found" };

  const adminClient = createAdminClient();
  const { data: tdRec } = await adminClient
    .from("td_sessions")
    .select("teacher_id, school_id")
    .eq("id", sessionId)
    .single();
  if (!tdRec) return { ok: false as const, status: 404, error: "Session introuvable" };

  if (user.role === "super_admin" || user.role === "admin_school") {
    if (tdRec.school_id !== user.school_id) {
      return { ok: false as const, status: 403, error: "Forbidden" };
    }
    return { ok: true as const };
  }

  if (user.role === "teacher") {
    const { data: teacherRec } = await adminClient
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("school_id", user.school_id)
      .single();
    if (!teacherRec || teacherRec.id !== tdRec.teacher_id) {
      return { ok: false as const, status: 403, error: "Forbidden" };
    }
    return { ok: true as const };
  }

  return { ok: false as const, status: 403, error: "Forbidden" };
}

export async function getSchoolHeaders() {
  const headersList = await headers();
  return {
    schoolId: headersList.get("x-school-id"),
    schoolName: headersList.get("x-school-name"),
    schoolColor: headersList.get("x-school-color"),
  };
}

/**
 * Vérifie qu'un utilisateur authentifié peut accéder aux données d'un élève :
 * admin de l'école, super_admin de la même école, l'élève lui-même, ou un parent lié.
 */
export async function canAccessStudent(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  auth: { userId: string; schoolId: string; role: string },
  studentId: string,
  schoolId: string,
): Promise<boolean> {
  if (auth.role === "admin_school" && auth.schoolId === schoolId) return true;
  if (auth.role === "super_admin" && auth.schoolId === schoolId) return true;

  if (auth.role === "student") {
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("user_id", auth.userId)
      .eq("school_id", schoolId)
      .maybeSingle();
    return !!student;
  }

  if (auth.role === "parent") {
    const { data: parent } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!parent) return false;

    const { data: link } = await supabaseAdmin
      .from("student_parents")
      .select("id")
      .eq("student_id", studentId)
      .eq("parent_id", parent.id)
      .maybeSingle();
    return !!link;
  }

  return false;
}
