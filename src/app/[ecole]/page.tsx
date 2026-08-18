import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function rolePath(role: string): string {
  return role === "admin_school"
    ? "/admin"
    : `/${role}`;
}

async function resolveUser(userId: string): Promise<{ slug: string; role: string } | null> {
  try {
    const adminClient = createAdminClient();
    const { data: user } = await adminClient
      .from("users")
      .select("role, school_id")
      .eq("id", userId)
      .single();
    if (!user) return null;
    const { data: school } = await adminClient
      .from("schools")
      .select("subdomain")
      .eq("id", user.school_id)
      .single();
    if (!school) return null;
    return { slug: school.subdomain, role: user.role };
  } catch {
    return null;
  }
}

export default async function SchoolHomePage({
  params,
}: {
  params: Promise<{ ecole: string }>;
}) {
  const { ecole } = await params;
  const auth = await getAuthUser(ecole);

  // Cas 1 : l'utilisateur est authentifié et reconnu
  if (auth) {
    // Vérifier que l'école dans l'URL correspond bien à l'utilisateur
    // (getAuthUser peut bypasser le check si la résolution de schoolId échoue)
    const adminClient = createAdminClient();
    const { data: urlSchool } = await adminClient
      .from("schools")
      .select("id")
      .eq("subdomain", ecole)
      .single();

    if (urlSchool && urlSchool.id !== auth.schoolId) {
      const resolved = await resolveUser(auth.userId);
      if (resolved && resolved.role !== "super_admin") redirect(`/${resolved.slug}${rolePath(resolved.role)}`);
      if (resolved?.role === "super_admin") redirect("/super-admin");
      redirect(`/login?school=${ecole}`);
    }

    if (auth.role === "super_admin") redirect("/super-admin");

    redirect(`/${ecole}${rolePath(auth.role)}`);
  }

  // Cas 2 : pas d'auth — essayer de lire la session directement
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    const resolved = await resolveUser(session.user.id);
    if (resolved?.role === "super_admin") redirect("/super-admin");
    if (resolved) redirect(`/${resolved.slug}${rolePath(resolved.role)}`);
  }

  redirect(`/login?school=${ecole}`);
}
