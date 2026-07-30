import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Settings2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TuitionFeesConfig from "@/components/payments/tuition-fees-config";
import Link from "next/link";

export default async function TuitionFeesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: currentAY } = await supabaseAdmin
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  const { data: fees } = await supabaseAdmin
    .from("tuition_fees")
    .select(`
      *,
      class:class_id(id, name),
      academic_year:academic_year_id(id, name)
    `)
    .eq("school_id", schoolId)
    .eq("academic_year_id", currentAY?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${slug}/admin/payments`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Frais de scolarité</h1>
            <p className="text-muted-foreground">
              Configurez le montant mensuel et la date limite par classe pour l&apos;année {currentAY?.name || "en cours"}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Settings2 className="h-4 w-4" />
          <span>Configuration</span>
        </div>
      </div>

      {!currentAY ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucune année scolaire active. Créez d&apos;abord une année scolaire.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/${slug}/admin/academic-years`}>Gérer les années scolaires</Link>
          </Button>
        </div>
      ) : (
        <TuitionFeesConfig
          classes={classes || []}
          fees={fees || []}
          academicYearId={currentAY.id}
        />
      )}
    </div>
  );
}
