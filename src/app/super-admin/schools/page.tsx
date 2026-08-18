import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { SchoolsList } from "@/components/super-admin/schools-list";

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
            Partenaires et affiliés de la plateforme GESchool.
          </p>
        </div>
        <Button asChild>
          <Link href="/super-admin/schools/new">
            <Plus className="h-4 w-4 mr-2" />
            Créer une école
          </Link>
        </Button>
      </div>

      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          <SchoolsList schools={(schools ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            subdomain: s.subdomain ?? "",
            is_active: s.is_active ?? false,
            created_at: s.created_at ?? null,
            primary_color: s.primary_color ?? null,
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}