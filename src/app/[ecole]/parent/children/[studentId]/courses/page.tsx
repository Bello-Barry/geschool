import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseAttachmentList } from "@/components/courses/course-attachment-list";
import { MathContent } from "@/components/math/math-content";

interface PageProps {
  params: Promise<{ ecole: string; studentId: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function ParentChildCoursesPage({ params, searchParams }: PageProps) {
  const { ecole: slug, studentId } = await params;
  const { q } = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();
  if (!parent) redirect(`/${slug}/parent/children`);

  const { data: link } = await supabaseAdmin
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id)
    .eq("student_id", studentId)
    .single();
  if (!link) redirect(`/${slug}/parent/children`);

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, class_id, matricule, user:user_id(first_name, last_name)")
    .eq("id", studentId)
    .single();
  if (!student) redirect(`/${slug}/parent/children`);

  const userInfo = Array.isArray(student.user) ? student.user[0] : student.user;

  let query = supabaseAdmin
    .from("courses")
    .select(`
      id, title, key_points, status, created_at,
      teacher:teacher_id(id),
      subject:subject_id(id, name),
      class:class_id(id, name)
    `)
    .eq("class_id", student.class_id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.textSearch("search_vector", q, { config: "french" });
  }

  const { data: courses } = await query;
  const courseIds = courses?.map((c) => c.id) || [];

  const { data: allAttachments } = courseIds.length > 0
    ? await supabaseAdmin
        .from("course_attachments")
        .select("*")
        .in("course_id", courseIds)
        .order("created_at")
    : { data: [] };

  const attachmentsByCourse: Record<string, any[]> = {};
  for (const att of allAttachments || []) {
    const list = attachmentsByCourse[att.course_id] || [];
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("course-attachments")
      .createSignedUrl(att.storage_path, 3600);
    list.push({ ...att, signed_url: signedUrlData?.signedUrl || null });
    attachmentsByCourse[att.course_id] = list;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cours de {userInfo?.first_name} {userInfo?.last_name}</h1>
        <p className="text-gray-600 mt-2">Consultez les cours publiés pour votre enfant</p>
      </div>

      <form className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Rechercher un cours..."
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      {(!courses || courses.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">
              {q
                ? `Aucun cours trouvé pour "${q}"`
                : "Aucun cours publié pour le moment"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses?.map((course: any) => {
          const subjectName = Array.isArray(course.subject)
            ? course.subject[0]?.name
            : course.subject?.name;
          return (
            <Card key={course.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <Badge variant="outline">{subjectName || "—"}</Badge>
                </div>
                <CardDescription>
                  {new Date(course.created_at).toLocaleDateString("fr-FR")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {course.key_points && (
                  <MathContent
                    text={course.key_points}
                    className="mb-4 text-sm text-gray-600 line-clamp-4"
                  />
                )}
                <div className="mt-auto">
                  <CourseAttachmentList attachments={attachmentsByCourse[course.id] || []} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
