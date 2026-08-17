import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ReportsActions } from "@/components/reports/reports-actions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: reports } = await supabaseAdmin
    .from("report_cards")
    .select(`
      id, general_average, class_rank, total_students, status, generated_at,
      term:term_id(name),
      student:student_id(matricule, user:user_id(first_name, last_name), class:class_id(name))
    `)
    .eq("school_id", schoolId)
    .order("generated_at", { ascending: false });

  const byStatus = (reports ?? []).reduce<Record<string, number>>((acc, r: any) => {
    const key = r.status ?? "draft";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulletins</h1>
        <p className="text-gray-600 mt-2">
          {reports?.length ?? 0} bulletins générés
          {Object.entries(byStatus).map(([status, count]) => (
            <span key={status} className="ml-2">
              · {count} {status === "published" ? "publiés" : status === "draft" ? "brouillons" : status}
            </span>
          ))}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registre des bulletins</CardTitle>
          <CardDescription>Bulletins générés pour tous les élèves de l&apos;école</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {reports && reports.length > 0 ? (
            <ReportsActions reports={reports as any} downloadApiPath="/api/reports/download" />
          ) : (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Aucun bulletin généré pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}