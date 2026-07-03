import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TeacherGradesPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Récupérer les classes et matières de l'enseignant
  const { data: teacherSubjects } = await supabase
    .from("teacher_subjects")
    .select(`
      id,
      subject:subject_id(id, name),
      class:class_id(id, name)
    `)
    .eq("school_id", schoolId);

  // Grouper par classe
  const classesBySubject = (teacherSubjects || []).reduce(
    (acc: any, ts: any) => {
      if (!acc[ts.class.id]) {
        acc[ts.class.id] = [];
      }
      acc[ts.class.id].push(ts);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Saisie des notes</h1>
        <p className="text-gray-600 mt-2">Entrez les notes de vos élèves</p>
      </div>

      {/* Classes avec notes à saisir */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(classesBySubject).map(([classId, subjects]: [string, any]) => {
          const className = subjects[0]?.class?.name;
          return (
            <Link
              key={classId}
              href={`/teacher/grades/${classId}`}
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{className}</CardTitle>
                  <CardDescription>
                    {subjects.length} matière{subjects.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subjects.map((ts: any) => (
                    <div
                      key={ts.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">{ts.subject.name}</span>
                      <Button size="sm" variant="outline">
                        Éditer
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {Object.entries(classesBySubject).length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500">Aucune classe assignée pour le moment</p>
        </Card>
      )}
    </div>
  );
}
