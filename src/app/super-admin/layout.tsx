import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { decodeAuthCookie, getAuthCookieName } from "@/lib/utils/session-resolver";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authCookieName = getAuthCookieName();
  const authCookie = cookieStore.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value ?? "");

  if (!session) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!currentUser || currentUser.role !== "super_admin") {
    redirect("/");
  }

  return (
    <DashboardShell
      role="super_admin_platform"
      schoolName="Geschool Admin"
      schoolSlug=""
      primaryColor="#4F46E5"
    >
      {children}
    </DashboardShell>
  );
}
