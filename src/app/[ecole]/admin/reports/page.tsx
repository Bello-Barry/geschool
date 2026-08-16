import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

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
          <CardDescription>Bulletins générés pour tous les élèves de l'école</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Élève</th>
                  <th className="text-left py-3 px-4 font-semibold">Classe</th>
                  <th className="text-left py-3 px-4 font-semibold">Trimestre</th>
                  <th className="text-left py-3 px-4 font-semibold">Moyenne</th>
                  <th className="text-left py-3 px-4 font-semibold">Rang</th>
                  <th className="text-left py-3 px-4 font-semibold">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold">Généré le</th>
                  <th className="text-right py-3 px-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {reports && reports.length > 0 ? (
                  reports.map((rec: any) => {
                    const studentInfo = unwrapJoin(rec.student) as {
                      matricule: string;
                      user: { first_name: string; last_name: string } | null;
                      class: { name: string } | null;
                    } | null;
                    const termInfo = unwrapJoin(rec.term) as { name: string } | null;
                    return (
                      <tr key={rec.id} className="border-b hover:bg-neutral-50">
                        <td className="py-3 px-4">
                          {studentInfo?.user?.last_name} {studentInfo?.user?.first_name}
                          <span className="text-xs text-neutral-400 ml-2">{studentInfo?.matricule}</span>
                        </td>
                        <td className="py-3 px-4">{studentInfo?.class?.name ?? "-"}</td>
                        <td className="py-3 px-4">{termInfo?.name ?? "-"}</td>
                        <td className="py-3 px-4 font-medium">
                          {rec.general_average != null ? `${rec.general_average}/20` : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {rec.class_rank != null
                            ? `${rec.class_rank}${rec.total_students ? ` / ${rec.total_students}` : ""}`
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.status as any} />
                        </td>
                        <td className="py-3 px-4">
                          {rec.generated_at ? new Date(rec.generated_at).toLocaleDateString("fr-FR") : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a href={`/api/reports/download/${rec.id}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Télécharger
                            </Button>
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">Aucun bulletin généré pour le moment</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}