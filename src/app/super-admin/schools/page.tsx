import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Building2, Search, Plus, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { SchoolActions } from "@/components/super-admin/school-actions";

export const metadata = {
  title: "Écoles — Super Admin",
};

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const supabaseAdmin = createAdminClient();

  const { data: schools } = await supabaseAdmin
    .from("schools")
    .select("id, name, subdomain, is_active, created_at, primary_color")
    .order("created_at", { ascending: false });

  const activeCount = (schools ?? []).filter(s => s.is_active).length;
  const inactiveCount = (schools ?? []).filter(s => !s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Gestion des Écoles
          </h2>
          <p className="text-muted-foreground mt-1">
            {schools?.length ?? 0} établissements ·{" "}
            <span className="text-emerald-600 font-medium">{activeCount} actifs</span>
            {inactiveCount > 0 && (
              <span className="text-red-500 font-medium"> · {inactiveCount} suspendus</span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/super-admin/schools/new">
            <Plus className="h-4 w-4 mr-2" />
            Créer une école
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une école..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(schools ?? []).map((school) => (
              <div key={school.id} className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors gap-4">
                {/* Identity */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                    style={{ background: school.primary_color ?? "#4F46E5" }}
                  >
                    {school.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base truncate">{school.name}</h3>
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
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{school.subdomain}.geschool.com</span>
                      <span>·</span>
                      <span>Inscrite le {new Date(school.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Button variant="ghost" size="sm" asChild className="h-8">
                    <Link href={`/super-admin/schools/${school.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Voir détails
                    </Link>
                  </Button>
                  <SchoolActions
                    schoolId={school.id}
                    schoolName={school.name}
                    isActive={school.is_active ?? false}
                  />
                </div>
              </div>
            ))}
            {(!schools || schools.length === 0) && (
              <div className="px-6 py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Aucune école inscrite pour le moment.</p>
                <p className="text-sm text-muted-foreground mt-1">Les directeurs s'inscrivent via la page publique <strong>/register</strong>.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
