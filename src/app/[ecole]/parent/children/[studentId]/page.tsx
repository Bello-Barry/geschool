import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function StudentDetailPage({
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
    .select("id, matricule, photo_url, date_of_birth, gender, user:user_id(first_name, last_name), class:class_id(id, name)")
    .eq("id", studentId)
    .single();

  if (!student) redirect(`/${ecole}/parent/children`);

  const { data: currentTerm } = await supabaseAdmin
    .from("terms")
    .select("id")
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

  const { data: latestGrades } = await supabaseAdmin
    .from("grades")
    .select("score, max_score, grade_type, date, subject:subject_id(name)")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(10);

  const userInfo = unwrapJoin(student.user) as { first_name: string; last_name: string } | null;
  const classInfo = unwrapJoin(student.class) as { id: string; name: string } | null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${ecole}/parent/children`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Retour aux enfants
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {userInfo?.first_name} {userInfo?.last_name}
            </CardTitle>
            <CardDescription>
              {classInfo?.name} &middot; {student.matricule}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {generalAverage !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Moyenne générale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{generalAverage.toFixed(2)}<span className="text-lg text-gray-400">/20</span></p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/${ecole}/parent/children/${studentId}/reports`}>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Voir les bulletins
              </Button>
            </Link>
            <Link href={`/${ecole}/parent/children/${studentId}/attendance`}>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Voir les présences
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières notes</CardTitle>
          <CardDescription>Les 10 dernières notes enregistrées</CardDescription>
        </CardHeader>
        <CardContent>
          {latestGrades && latestGrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Matière</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-right py-3 px-4 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {latestGrades.map((g: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4">{g.subject?.name}</td>
                      <td className="py-3 px-4 capitalize">{g.grade_type === "homework" ? "Devoir" : g.grade_type === "test" ? "Interro" : "Compo"}</td>
                      <td className="py-3 px-4 text-right font-mono">{g.score != null ? `${g.score}/${g.max_score}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">Aucune note pour le moment</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
