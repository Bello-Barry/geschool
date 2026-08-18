import { createAdminClient } from "@/lib/supabase/admin";
import { Users } from "lucide-react";
import { UsersList } from "@/components/super-admin/users-list";
import { unwrapJoin } from "@/lib/utils/supabase-join";

export const metadata = {
  title: "Utilisateurs — Super Admin",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabaseAdmin = createAdminClient();

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name, role, is_active, created_at, school_id, school:school_id(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (users ?? []).map((u) => {
    const schoolInfo = unwrapJoin(u.school) as { name: string | null } | null;
    return {
      id: u.id,
      email: u.email ?? null,
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      role: u.role ?? "user",
      is_active: u.is_active !== false,
      created_at: u.created_at ?? null,
      school: schoolInfo ? { name: schoolInfo.name ?? null } : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-muted-foreground mt-1">
            Supervisez tous les utilisateurs de la plateforme.
          </p>
        </div>
      </div>

      <UsersList users={rows} />
    </div>
  );
}