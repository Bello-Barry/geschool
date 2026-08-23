"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { SchoolActions } from "@/components/super-admin/school-actions";

interface SchoolRow {
  id: string;
  name: string;
  subdomain: string | null;
  is_active: boolean;
  created_at: string | null;
  primary_color: string | null;
  has_director?: boolean;
}

const PAGE_SIZE = 10;

export function SchoolsList({ schools }: { schools: SchoolRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      if (status === "active" && !s.is_active) return false;
      if (status === "inactive" && s.is_active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.subdomain ?? "").toLowerCase().includes(q)
      );
    });
  }, [schools, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const activeCount = schools.filter((s) => s.is_active).length;
  const inactiveCount = schools.length - activeCount;

  return (
    <div className="space-y-4">
      <CardHeaderLine
        total={schools.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

      {/* Recherche + filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, sous-domaine..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              { key: "all", label: "Toutes" },
              { key: "active", label: "Actives" },
              { key: "inactive", label: "Suspendues" },
            ] as const
          ).map(({ key, label }) => (
            <Button
              key={key}
              variant={status === key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatus(key);
                setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="divide-y rounded-xl border bg-card">
        {pageItems.map((school) => {
          const hasUnusedSubdomain = (school.subdomain ?? "").length === 0;
          return (
            <div key={school.id} className="flex items-center justify-between px-6 py-4 gap-4 flex-col lg:flex-row">
              <Link
                href={`/super-admin/schools/${school.id}`}
                className="flex items-center gap-4 min-w-0 flex-1 group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                  style={{ background: school.primary_color ?? "#4F46E5" }}
                >
                  {school.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base truncate group-hover:underline">
                      {school.name}
                    </h3>
                    {school.has_director === false && (
                      <Badge variant="outline" className="gap-1 text-amber-700 bg-amber-50 border-amber-200 shrink-0">
                        <UserPlus className="h-3 w-3" />Directeur à attacher
                      </Badge>
                    )}
                    {school.is_active ? (
                      <Badge className="gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-50 border-emerald-200 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />Active
                      </Badge>
                    ) : (
                      <Badge className="gap-1 text-red-600 bg-red-50 hover:bg-red-50 border-red-200 shrink-0">
                        <XCircle className="h-3 w-3" />Suspendue
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {hasUnusedSubdomain ? "sous-domaine manquant" : `${school.subdomain}.geschool.com`}
                    </span>
                    <span>·</span>
                    <span>
                      Inscrite le{" "}
                      {school.created_at
                        ? new Date(school.created_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Actions */}
              <SchoolActions
                schoolId={school.id}
                schoolName={school.name}
                isActive={school.is_active ?? false}
                hasDirector={school.has_director}
              />
            </div>
          );
        })}
        {pageItems.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-muted-foreground font-medium">Aucune école trouvée.</p>
            {query && (
              <p className="text-sm text-muted-foreground mt-1">
                Essayez un autre nom ou sous-domaine, ou changez le filtre.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} école{filtered.length > 1 ? "s" : ""} ·{" "}
            {(pageSafe - 1) * PAGE_SIZE + 1}–
            {Math.min(pageSafe * PAGE_SIZE, filtered.length)}
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

function CardHeaderLine({
  total,
  activeCount,
  inactiveCount,
}: {
  total: number;
  activeCount: number;
  inactiveCount: number;
}) {
  return (
    <p className="text-muted-foreground mt-1">
      {total} établissements ·{" "}
      <span className="text-emerald-600 font-medium">{activeCount} actifs</span>
      {inactiveCount > 0 && (
        <span className="text-red-500 font-medium"> · {inactiveCount} suspendus</span>
      )}
    </p>
  );
}