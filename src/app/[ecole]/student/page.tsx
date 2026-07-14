import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { GraduationCap, BookOpen, BarChart3, Medal } from "lucide-react";

export default async function StudentDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "student") redirect(`/${slug}/login`);

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(`
      id,
      matricule,
      user:user_id(first_name, last_name, email),
      class:class_id(name, level)
    `)
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!student) redirect(`/${slug}/login`);

  const userData = student.user as unknown as { first_name: string; last_name: string; email: string } | null;
  const classInfo = student.class as unknown as { name: string; level: string } | null;

  const { data: recentGrades } = await supabase
    .from("grades")
    .select(`
      id,
      score,
      max_score,
      grade_type,
      date,
      subject:subject_id(name, coefficient),
      term:term_id(name, is_current)
    `)
    .eq("student_id", student.id)
    .order("date", { ascending: false })
    .limit(10);

  const grades = recentGrades as unknown as Array<{
    id: string; score: number; max_score: number; grade_type: string; date: string;
    subject: { name: string; coefficient: number } | null;
    term: { name: string; is_current: boolean } | null;
  }> | null;

  const allScores = grades?.filter(g => g.score != null).map(g => g.score) || [];
  const average = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
    : null;

  const gradeTypeLabel = (t: string) => {
    const map: Record<string, string> = { homework: "Devoir", test: "Interro", exam: "Composition" };
    return map[t] || t;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Bonjour, {userData?.first_name} {userData?.last_name}
        </h1>
        <p className="text-gray-600 mt-2">Bienvenue sur votre espace élève</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classe</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classInfo?.name || "-"}</div>
            <p className="text-xs text-gray-600">{classInfo?.level || ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne générale</CardTitle>
            <Medal className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{average !== null ? `${average}/20` : "N/A"}</div>
            <p className="text-xs text-gray-600">Sur les dernières notes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allScores.length}</div>
            <p className="text-xs text-gray-600">Notes enregistrées</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href={`/${slug}/student/grades`}>
            <Button className="w-full">
              <BookOpen className="h-4 w-4 mr-2" />
              Voir mes notes
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières notes</CardTitle>
          <CardDescription>Vos 10 dernières évaluations</CardDescription>
        </CardHeader>
        <CardContent>
          {grades && grades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Matière</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Trimestre</th>
                    <th className="text-left py-3 px-4 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4">{g.subject?.name || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{gradeTypeLabel(g.grade_type)}</Badge>
                      </td>
                      <td className="py-3 px-4">{g.term?.name || "-"}</td>
                      <td className="py-3 px-4 font-semibold">{g.score}/{g.max_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Aucune note pour le moment</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
