import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { UserActions } from "@/components/super-admin/user-actions";

export const metadata = {
  title: "Utilisateurs — Super Admin",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabaseAdmin = createAdminClient();

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name, role, is_active, created_at, school_id")
    .order("created_at", { ascending: false })
    .limit(50); // Pagination in real world

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

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, email..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-3">Utilisateur</th>
                  <th className="px-6 py-3">Rôle</th>
                  <th className="px-6 py-3">École</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(users ?? []).map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.first_name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === "super_admin" ? (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">Super Admin</Badge>
                      ) : user.role === "admin_school" ? (
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Admin École</Badge>
                      ) : (
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {user.school_id ? (
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">...{user.school_id.substring(0, 8)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active !== false ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-600 font-medium">
                          <span className="h-2 w-2 rounded-full bg-red-500" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <UserActions userId={user.id} isActive={user.is_active !== false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.length === 0) && (
              <div className="px-6 py-12 text-center text-muted-foreground">
                Aucun utilisateur trouvé.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
