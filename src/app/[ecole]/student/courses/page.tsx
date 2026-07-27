import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseFilterForm } from "@/components/courses/course-filter-form";
import { CourseAttachmentList } from "@/components/courses/course-attachment-list";

interface PageProps {
  params: Promise<{ ecole: string }>;
  searchParams: Promise<{ q?: string; subject_id?: string }>;
}

export default async function StudentCoursesPage({ params, searchParams }: PageProps) {
  const slug = (await params).ecole;
  const { q, subject_id } = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "student") redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, class_id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();
  if (!student) redirect(`/${slug}/login`);

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

  if (subject_id) query = query.eq("subject_id", subject_id);

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

  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .order("name");

  const safeSubjects = subjects || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cours</h1>
        <p className="text-gray-600 mt-2">Consultez les cours de votre classe</p>
      </div>

      <CourseFilterForm subjects={safeSubjects} defaultQ={q} defaultSubjectId={subject_id} />

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
                  <div className="text-sm text-gray-600 mb-4 line-clamp-4 whitespace-pre-line">
                    {course.key_points}
                  </div>
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
