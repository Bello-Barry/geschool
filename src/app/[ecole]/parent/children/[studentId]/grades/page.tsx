import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function StudentGradesPage({
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

  const { data: currentTerm } = await supabaseAdmin
    .from("terms")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .eq("is_current", true)
    .single();

  let generalAverage: number | null = null;
  if (currentTerm) {
    const { data: avg } = await supabaseAdmin.rpc("calculate_general_average", {
      p_student_id: studentId,
      p_term_id: currentTerm.id,
    });
    generalAverage = typeof avg === "number" ? avg : null;
  }

  const { data: grades } = await supabaseAdmin
    .from("grades")
    .select("score, max_score, grade_type, date, subject:subject_id(name)")
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  const userInfo = (Array.isArray(student.user) ? student.user[0] : student.user) as { first_name: string; last_name: string } | null;
  const classInfo = (Array.isArray(student.class) ? student.class[0] : student.class) as { name: string } | null;

  const typeLabels: Record<string, string> = {
    homework: "Devoir",
    test: "Interro",
    exam: "Compo",
  };

  const typeColors: Record<string, "default" | "secondary" | "outline"> = {
    homework: "default",
    test: "secondary",
    exam: "outline",
  };

  const groupedBySubject: Record<string, any[]> = {};
  for (const g of grades || []) {
    const subj = Array.isArray(g.subject) ? g.subject[0] : g.subject;
    const subjName = (subj as unknown as { name: string })?.name || "Inconnue";
    if (!groupedBySubject[subjName]) groupedBySubject[subjName] = [];
    groupedBySubject[subjName].push(g);
  }

  const subjectAverages: Record<string, number> = {};
  for (const [subj, gs] of Object.entries(groupedBySubject)) {
    const hw = gs.find((g: any) => g.grade_type === "homework")?.score || 0;
    const test = gs.find((g: any) => g.grade_type === "test")?.score || 0;
    const exam = gs.find((g: any) => g.grade_type === "exam")?.score || 0;
    if (hw === 0 && test === 0 && exam === 0) continue;
    const avg = Math.round(((hw + test + exam * 2) / 4) * 100) / 100;
    subjectAverages[subj] = avg;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${ecole}/parent/children/${studentId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Retour à {userInfo?.first_name}
        </Link>
        <h1 className="text-3xl font-bold mt-2">
          Notes de {userInfo?.first_name} {userInfo?.last_name}
        </h1>
        <p className="text-gray-600 mt-1">
          {classInfo?.name} &middot; {student.matricule}
          {currentTerm && <span> &middot; {currentTerm.name}</span>}
        </p>
      </div>

      {generalAverage !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Moyenne générale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {generalAverage.toFixed(2)}
              <span className="text-lg text-gray-400">/20</span>
            </p>
          </CardContent>
        </Card>
      )}

      {grades && grades.length > 0 ? (
        Object.entries(groupedBySubject).map(([subjName, subjectGrades]) => {
          const avg = subjectAverages[subjName];
          return (
            <Card key={subjName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{subjName}</CardTitle>
                  {avg !== undefined && (
                    <Badge variant={avg >= 10 ? "default" : "secondary"}>
                      {avg.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {subjectGrades.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {new Date(g.date).toLocaleDateString("fr-FR")}
                        </span>
                        <Badge variant={typeColors[g.grade_type] || "outline"}>
                          {typeLabels[g.grade_type] || g.grade_type}
                        </Badge>
                      </div>
                      <span className="font-mono font-semibold">
                        {g.score != null ? `${g.score}/${g.max_score}` : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucune note pour le moment</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
