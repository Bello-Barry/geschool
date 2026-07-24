import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function TeacherAttendancePage({ params }: { params: Promise<{ ecole: string }> }) {
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

  const classMap = new Map<string, any>();
  for (const ts of teacherSubjects || []) {
    const cls = Array.isArray(ts.class) ? ts.class[0] : ts.class;
    if (cls && !classMap.has(cls.id)) {
      classMap.set(cls.id, cls);
    }
  }
  const classes = Array.from(classMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Appel des présences</h1>
        <p className="text-gray-600 mt-2">Sélectionnez une classe pour faire l&apos;appel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classes.map((cls: any) => (
          <Link key={cls.id} href={`/${slug}/teacher/attendance/${cls.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{cls.name}</CardTitle>
                <CardDescription>Faire l&apos;appel</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {classes.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500">Aucune classe assignée pour le moment</p>
        </Card>
      )}
    </div>
  );
}
