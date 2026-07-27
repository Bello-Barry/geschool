import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { AssignmentForm } from "@/components/forms/assignment-form";

export default async function EditAssignmentPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
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

  const { data: assignment } = await supabaseAdmin
    .from("assignments")
    .select(`
      id, title, description, type, due_date, status,
      subject_id, class_id, term_id
    `)
    .eq("id", id)
    .eq("teacher_id", teacherRec.id)
    .single();
  if (!assignment) redirect(`/${slug}/teacher/assignments`);

  const { data: attachments } = await supabaseAdmin
    .from("assignment_attachments")
    .select("*")
    .eq("assignment_id", id)
    .order("created_at");

  const withUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from("assignment-attachments")
        .createSignedUrl(att.storage_path, 3600);
      return { ...att, signed_url: signedUrlData?.signedUrl || null };
    })
  );

  const { data: ts } = await supabaseAdmin
    .from("teacher_subjects")
    .select("subject:subject_id(id, name), class:class_id(id, name)")
    .eq("teacher_id", teacherRec.id);

  const subjectsMap = new Map<string, string>();
  const classesMap = new Map<string, string>();
  for (const row of ts || []) {
    const sub = Array.isArray(row.subject) ? row.subject[0] : row.subject;
    if (sub) subjectsMap.set(sub.id, sub.name);
    const cls = Array.isArray(row.class) ? row.class[0] : row.class;
    if (cls) classesMap.set(cls.id, cls.name);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Modifier le devoir / TD</h1>
      <AssignmentForm
        slug={slug}
        subjects={Array.from(subjectsMap.entries()).map(([id, name]) => ({ id, name }))}
        classes={Array.from(classesMap.entries()).map(([id, name]) => ({ id, name }))}
        assignment={{ ...assignment, attachments: withUrls }}
      />
    </div>
  );
}
