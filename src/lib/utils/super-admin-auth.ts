import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeAuthCookie, getAuthCookieName } from "@/lib/utils/session-resolver";

/**
 * Retourne le client admin si l'utilisateur courant est un super_admin,
 * sinon null. Utilisé par les routes API de la console plateforme.
 */
export async function getSuperAdminClient() {
  const cookieStore = await cookies();
  const authCookieName = getAuthCookieName();
  const authCookie = cookieStore.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value ?? "");

  if (!session) return null;

  const supabaseAdmin = createAdminClient();
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  return currentUser?.role === "super_admin" ? supabaseAdmin : null;
}