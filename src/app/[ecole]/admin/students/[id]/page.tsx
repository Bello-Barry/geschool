import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Pencil, ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteStudentButton } from "@/components/forms/delete-student-button";
import GenerateReportButton from "@/components/forms/generate-report-button";
import { ToggleActiveButton } from "@/components/forms/toggle-active-button";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ ecole: string; id: string }>;
}) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: student } = await supabaseAdmin
    .from("students")
    .select(`
      id,
      user_id,
      matricule,
      date_of_birth,
      place_of_birth,
      gender,
      created_at,
      user:user_id(
        first_name,
        last_name,
        email,
        is_active
      ),
      class:class_id(
        id,
        name
      )
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!student) {
    redirect(`/${ecole}/admin/students`);
  }

  const { data: parents } = await supabaseAdmin
    .from("student_parents")
    .select(`
      parent:parent_id(
        id,
        user:user_id(
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq("student_id", id);

  const { data: grades } = await supabaseAdmin
    .from("grades")
    .select(`
      id,
      score,
      subject:subject_id(name),
      term:term_id(name)
    `)
    .eq("student_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: terms } = await supabaseAdmin
    .from("terms")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .order("name");

  const { data: existingReports } = await supabaseAdmin
    .from("report_cards")
    .select("id, term_id, general_average, class_rank, status, generated_at")
    .eq("student_id", id);

  const reportMap = new Map(
    (existingReports ?? []).map((r: any) => [r.term_id, r]),
  );

  const userInfo = unwrapJoin(student.user) as { first_name: string; last_name: string; email: string; is_active: boolean } | null;
  const classInfo = unwrapJoin(student.class) as { id: string; name: string } | null;
  const studentUserId = (student as any).user_id as string | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${ecole}/admin/students`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {userInfo?.first_name} {userInfo?.last_name}
              </h1>
              {userInfo && (
                <Badge variant={userInfo.is_active === false ? "secondary" : "outline"}>
                  {userInfo.is_active === false ? "Inactif" : "Actif"}
                </Badge>
              )}
            </div>
            <p className="text-gray-600 mt-1">{student.matricule}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${ecole}/admin/students/${id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </Link>
          <DeleteStudentButton id={id} slug={ecole} />
          {studentUserId && (
            <ToggleActiveButton userId={studentUserId} isActive={userInfo?.is_active ?? true} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Nom complet</span>
              <p className="font-medium">{userInfo?.first_name} {userInfo?.last_name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="font-medium">{userInfo?.email || "-"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Genre</span>
              <p className="font-medium">{student.gender === "M" ? "Masculin" : student.gender === "F" ? "Féminin" : "-"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Date de naissance</span>
              <p className="font-medium">{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("fr-FR") : "-"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Lieu de naissance</span>
              <p className="font-medium">{student.place_of_birth || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-lg">{classInfo?.name || "-"}</p>
          </CardContent>
        </Card>
      </div>

      {parents && parents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parents liés</CardTitle>
            <CardDescription>{parents.length} parent(s) associé(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {parents.map((sp: any) => {
                const p = sp.parent as { id: string; user: { first_name: string; last_name: string; email: string } | null };
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {p.user?.first_name} {p.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{p.user?.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {grades && grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dernières notes</CardTitle>
            <CardDescription>10 dernières évaluations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Matière</th>
                    <th className="text-left py-2 px-3 font-semibold">Trimestre</th>
                    <th className="text-right py-2 px-3 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g: any) => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{g.subject?.name || "-"}</td>
                      <td className="py-2 px-3">{g.term?.name || "-"}</td>
                      <td className="py-2 px-3 text-right font-medium">{g.score}/20</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {terms && terms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulletins</CardTitle>
            <CardDescription>Générer ou télécharger les bulletins par trimestre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {terms.map((term: any) => {
                const existing = reportMap.get(term.id);
                return (
                  <div
                    key={term.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{term.name}</p>
                      {existing && (
                        <p className="text-sm text-gray-500">
                          Moyenne: {existing.general_average ?? "-"}/20
                          {existing.class_rank != null && ` – Rang: ${existing.class_rank}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {existing ? (
                        <a href={`/api/reports/download/${existing.id}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Télécharger
                          </Button>
                        </a>
                      ) : (
                        <GenerateReportButton
                          studentId={id}
                          termId={term.id}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}