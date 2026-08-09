import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { MathContent } from "@/components/math/math-content";

export default async function TeacherCoursesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: teacherRec } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();
  if (!teacherRec) redirect(`/${slug}/teacher`);

  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select(`
      id, title, key_points, status, created_at, updated_at,
      subject:subject_id(name),
      class:class_id(name),
      term:term_id(name)
    `)
    .eq("teacher_id", teacherRec.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes cours"
        description="Créez et gérez vos contenus pédagogiques"
        actions={
          <Button asChild>
            <Link href={`/${slug}/teacher/courses/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau cours
            </Link>
          </Button>
        }
      />

      {(!courses || courses.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucun cours pour le moment</p>
            <Button asChild className="mt-4">
              <Link href={`/${slug}/teacher/courses/new`}>Créer un cours</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses?.map((course: any) => {
          const subjectName = Array.isArray(course.subject) ? course.subject[0]?.name : course.subject?.name;
          const className = Array.isArray(course.class) ? course.class[0]?.name : course.class?.name;
          return (
            <Card key={course.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>
                    {subjectName} — {className}
                  </CardDescription>
                </div>
                <Badge variant={course.status === "published" ? "default" : "secondary"}>
                  {course.status === "published" ? "Publié" : "Brouillon"}
                </Badge>
              </CardHeader>
              <CardContent>
                {course.key_points && (
                  <MathContent text={course.key_points} className="mb-4 text-sm text-gray-600 line-clamp-3" />
                )}
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${slug}/teacher/courses/${course.id}/edit`}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Modifier
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
