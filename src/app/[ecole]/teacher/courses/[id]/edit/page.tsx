import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { CourseForm } from "@/components/forms/course-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ ecole: string; id: string }>;
}) {
  const { ecole: slug, id } = await params;
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

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select(`
      *,
      attachments:course_attachments(id, file_name, file_type, file_size, storage_path, created_at)
    `)
    .eq("id", id)
    .eq("teacher_id", teacherRec.id)
    .single();
  if (!course) redirect(`/${slug}/teacher/courses`);

  const { data: teacherSubjects } = await supabaseAdmin
    .from("teacher_subjects")
    .select(`
      id,
      subject:subject_id(id, name),
      class:class_id(id, name)
    `)
    .eq("teacher_id", teacherRec.id);

  const subjectsMap = new Map<string, { id: string; name: string }>();
  const classesMap = new Map<string, { id: string; name: string }>();
  for (const ts of teacherSubjects || []) {
    const sub = Array.isArray(ts.subject) ? ts.subject[0] : ts.subject;
    const cls = Array.isArray(ts.class) ? ts.class[0] : ts.class;
    if (sub) subjectsMap.set(sub.id, sub);
    if (cls) classesMap.set(cls.id, cls);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Modifier le cours</h1>
      <CourseForm
        slug={slug}
        subjects={Array.from(subjectsMap.values())}
        classes={Array.from(classesMap.values())}
        course={course}
      />
    </div>
  );
}
