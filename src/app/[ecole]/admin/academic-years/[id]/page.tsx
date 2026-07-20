import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { AcademicYearDetail } from "@/components/academic-year-detail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ ecole: string; id: string }>;
}

export default async function AcademicYearDetailPage({ params }: PageProps) {
  const { ecole: slug, id } = await params;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: year, error } = await supabaseAdmin
    .from("academic_years")
    .select("*, terms(*)")
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (error || !year) {
    redirect(`/${slug}/admin/academic-years`);
  }

  const terms = (year.terms || []).sort((a: any, b: any) => a.term_number - b.term_number);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/admin/academic-years`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{year.name}</h1>
          <p className="text-muted-foreground">
            Du {year.start_date} au {year.end_date}
            {year.is_current && " — Année en cours"}
          </p>
        </div>
      </div>

      <AcademicYearDetail
        terms={terms}
      />
    </div>
  );
}
