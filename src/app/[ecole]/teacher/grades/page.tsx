import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function TeacherGradesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: teacherRecord } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!teacherRecord) redirect(`/${slug}/teacher`);

  const { data: teacherSubjects } = await supabaseAdmin
    .from("teacher_subjects")
    .select(`
      id,
      subject:subject_id(id, name),
      class:class_id(id, name)
    `)
    .eq("teacher_id", teacherRecord.id);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(classesBySubject).map(([classId, subjects]: [string, any]) => {
          const className = subjects[0]?.class?.name;
          return (
            <Card key={classId}>
              <CardHeader>
                <CardTitle>{className}</CardTitle>
                <CardDescription>
                  {subjects.length} matière{subjects.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {subjects.map((ts: any) => (
                  <Link
                    key={ts.id}
                    href={`/${slug}/teacher/grades/${classId}/${ts.subject.id}`}
                  >
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <span className="text-sm font-medium">{ts.subject.name}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
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
