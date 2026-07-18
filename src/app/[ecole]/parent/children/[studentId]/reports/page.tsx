import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import Link from "next/link";

export default async function StudentReportsPage({
  params,
}: {
  params: Promise<{ ecole: string; studentId: string }>;
}) {
  const { ecole, studentId } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || auth.role !== "parent") redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) redirect(`/${ecole}`);

  const { data: link } = await supabaseAdmin
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id)
    .eq("student_id", studentId)
    .single();

  if (!link) redirect(`/${ecole}/parent/children`);

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, matricule, user:user_id(first_name, last_name), class:class_id(name)")
    .eq("id", studentId)
    .single();

  if (!student) redirect(`/${ecole}/parent/children`);

  const { data: reports } = await supabaseAdmin
    .from("report_cards")
    .select(`
      id, general_average, class_rank, total_students, status, generated_at,
      term:term_id(name)
    `)
    .eq("student_id", studentId)
    .order("generated_at", { ascending: false });

  const userInfo = unwrapJoin(student.user) as { first_name: string; last_name: string } | null;
  const classInfo = unwrapJoin(student.class) as { name: string } | null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${ecole}/parent/children`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Retour aux enfants
        </Link>
        <h1 className="text-3xl font-bold mt-2">
          Bulletins de {userInfo?.first_name} {userInfo?.last_name}
        </h1>
        <p className="text-gray-600 mt-1">
          {classInfo?.name} &middot; {student.matricule}
        </p>
      </div>

      {reports && reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle>{report.term?.name}</CardTitle>
                <CardDescription>
                  Généré le{" "}
                  {report.generated_at
                    ? new Date(report.generated_at).toLocaleDateString("fr-FR")
                    : "-"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p>
                      <span className="text-gray-600">Moyenne :</span>{" "}
                      <span className="font-bold">
                        {report.general_average != null
                          ? `${report.general_average}/20`
                          : "-"}
                      </span>
                    </p>
                    {report.class_rank != null && (
                      <p>
                        <span className="text-gray-600">Rang :</span>{" "}
                        <span className="font-bold">
                          {report.class_rank}
                          {report.total_students
                            ? ` / ${report.total_students}`
                            : ""}
                        </span>
                      </p>
                    )}
                  </div>
                  <a href={`/api/reports/download/${report.id}`} target="_blank">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun bulletin disponible pour le moment</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
