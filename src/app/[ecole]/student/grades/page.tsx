import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StudentGradesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "student") redirect(`/${slug}/login`);

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!student) redirect(`/${slug}/login`);

  const { data: allGrades } = await supabase
    .from("grades")
    .select(`
      id,
      score,
      max_score,
      grade_type,
      date,
      subject:subject_id(name, coefficient),
      term:term_id(name, is_current, term_number)
    `)
    .eq("student_id", student.id)
    .order("date", { ascending: false });

  const grades = allGrades as unknown as Array<{
    id: string; score: number; max_score: number; grade_type: string; date: string;
    subject: { name: string; coefficient: number } | null;
    term: { name: string; is_current: boolean; term_number: number } | null;
  }> | null;

  // Group by subject
  const bySubject = new Map<string, NonNullable<typeof grades>>();
  (grades ?? []).forEach(g => {
    const key = g.subject?.name || "Autres";
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(g);
  });

  const gradeTypeLabel = (t: string) => {
    const map: Record<string, string> = { homework: "Devoir", test: "Interro", exam: "Composition" };
    return map[t] || t;
  };

  const currentTerm = grades?.find(g => g.term?.is_current)?.term;
  const subjectAverages = new Map<string, string>();
  if (grades) {
    for (const [subject, sg] of bySubject) {
      const scores = sg.filter(g => g.score != null).map(g => g.score);
      if (scores.length > 0) {
        subjectAverages.set(subject, (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/student`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Mes notes</h1>
      </div>

      {currentTerm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-blue-900 font-medium">
              Trimestre actuel : {currentTerm.name}
            </p>
          </CardContent>
        </Card>
      )}

      {grades && grades.length > 0 ? (
        [...bySubject.entries()].map(([subjectName, subjectGrades]) => (
          <Card key={subjectName}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{subjectName}</CardTitle>
                  <CardDescription>
                    Coefficient : {subjectGrades[0]?.subject?.coefficient || 1}
                    {subjectAverages.has(subjectName) && (
                      <span className="ml-4 font-semibold text-blue-700">
                        Moyenne : {subjectAverages.get(subjectName)}/20
                      </span>
                    )}
                  </CardDescription>
                </div>
                {subjectAverages.has(subjectName) && (
                  <div className="text-2xl font-bold text-blue-700">
                    {subjectAverages.get(subjectName)}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Trimestre</th>
                      <th className="text-left py-3 px-4 font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectGrades.map((g) => (
                      <tr key={g.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
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
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Aucune note enregistrée pour le moment
          </CardContent>
        </Card>
      )}
    </div>
  );
}
