import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";

export default async function TeacherClassesPage({ params }: { params: Promise<{ ecole: string }> }) {
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
      subject:subject_id(id, name, coefficient),
      class:class_id(id, name)
    `)
    .eq("teacher_id", teacherRecord.id);

  const classesMap = new Map<string, { name: string; subjects: { id: string; name: string; coefficient: number }[] }>();
  for (const ts of teacherSubjects || []) {
    const classObj = Array.isArray(ts.class) ? ts.class[0] : ts.class;
    const subjectObj = Array.isArray(ts.subject) ? ts.subject[0] : ts.subject;
    if (!classObj?.id || !subjectObj?.id) continue;
    if (!classesMap.has(classObj.id)) {
      classesMap.set(classObj.id, { name: classObj.name, subjects: [] });
    }
    classesMap.get(classObj.id)!.subjects.push(subjectObj!);
  }

  const entries = Array.from(classesMap.entries());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes classes</h1>
        <p className="text-gray-600 mt-2">Consultez la liste de vos classes et matières</p>
      </div>

      {entries.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucune classe assignée pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entries.map(([classId, cls]) => (
            <Card key={classId}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>{cls.name}</CardTitle>
                </div>
                <CardDescription>
                  {cls.subjects.length} matière{cls.subjects.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cls.subjects.map((subj) => (
                  <div key={subj.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{subj.name}</span>
                      <span className="text-xs text-gray-400">Coeff. {subj.coefficient}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${slug}/teacher/grades/${classId}/${subj.id}`}>
                          Notes
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
