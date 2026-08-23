"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { UserActions } from "@/components/super-admin/user-actions";

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string | null;
  school: { name: string | null } | null;
}

const PAGE_SIZE = 15;

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_school: "Admin École",
  teacher: "Enseignant",
  parent: "Parent",
  student: "Élève",
  accountant: "Comptable",
};

export function UsersList({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (!q) return true;
      return (
        (u.first_name ?? "").toLowerCase().includes(q) ||
        (u.last_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.school?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, role]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const roleCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) map.set(u.role, (map.get(u.role) ?? 0) + 1);
    return map;
  }, [users]);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mt-1">
        {users.length} utilisateurs sur l&apos;ensemble de la plateforme.
      </p>

      {/* Recherche + filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, école..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tous les rôles ({users.length})</option>
          {[...roleCount.entries()].map(([key, count]) => (
            <option key={key} value={key}>
              {ROLE_LABELS[key] ?? key} ({count})
            </option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <CardLike>
        <div className="overflow-x-auto rounded-xl border bg-card">
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
              {pageItems.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {user.first_name?.charAt(0) ?? user.email?.charAt(0) ?? "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[220px]">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "super_admin" ? (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">Super Admin</Badge>
                    ) : user.role === "admin_school" ? (
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Admin École</Badge>
                    ) : (
                      <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {user.school?.name ?? (
                      <span className="text-xs italic">— Plateforme</span>
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
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardLike>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(pageSafe - 1) * PAGE_SIZE + 1}–
            {Math.min(pageSafe * PAGE_SIZE, filtered.length)} / {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageSafe <= 1}
              onClick={() => setPage(pageSafe - 1)}
            >
              Précédent
            </Button>
            <span>
              {pageSafe} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage(pageSafe + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CardLike({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}