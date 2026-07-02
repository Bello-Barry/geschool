import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeAuthCookie, getAuthCookieName } from "@/lib/utils/session-resolver";

export async function getAuthUser() {
  const supabaseAdmin = createAdminClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) return null;

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
    .select("role")
    .eq("id", userId)
    .single();

  if (!user) return null;

  return { userId, schoolId, role: user.role };
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
