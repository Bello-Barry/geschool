import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Building2, Search, Plus, CheckCircle2, XCircle, Settings2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Gestion des Écoles
          </h2>
          <p className="text-muted-foreground mt-1">
            Supervisez toutes les écoles inscrites sur la plateforme.
          </p>
        </div>
        <Button asChild>
          <Link href="/super-admin/schools/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle école
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une école..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(schools ?? []).map((school) => (
              <div key={school.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                    style={{ background: school.primary_color ?? "#4F46E5" }}
                  >
                    {school.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base truncate">{school.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span className="font-medium">{school.subdomain}.geschool.com</span>
                      <span>·</span>
                      <span>Créée le {new Date(school.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  {school.is_active ? (
                    <Badge variant="secondary" className="gap-1 text-emerald-700 bg-emerald-50">
                      <CheckCircle2 className="h-3 w-3" />Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-red-600 bg-red-50">
                      <XCircle className="h-3 w-3" />Inactive
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/super-admin/schools/${school.id}`}>
                      <Settings2 className="h-4 w-4 mr-2" />
                      Gérer
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {(!schools || schools.length === 0) && (
              <div className="px-6 py-12 text-center text-muted-foreground">
                Aucune école trouvée.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
