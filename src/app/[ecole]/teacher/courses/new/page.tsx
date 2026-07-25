import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { CourseForm } from "@/components/forms/course-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function NewCoursePage({ params }: { params: Promise<{ ecole: string }> }) {
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

  const subjects = Array.from(subjectsMap.values());
  const classes = Array.from(classesMap.values());

  if (subjects.length === 0 || classes.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Nouveau cours</h1>
        <div className="text-center py-12 text-gray-500">
          Aucune classe ou matière assignée. Contactez l&apos;administration.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nouveau cours</h1>
      <CourseForm slug={slug} subjects={subjects} classes={classes} />
    </div>
  );
}
