import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TeacherSubjectForm } from "@/components/forms/teacher-subject-form";

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ ecole: string; id: string }>;
}) {
  const { ecole: slug, id } = await params;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: assignment } = await supabaseAdmin
    .from("teacher_subjects")
    .select("id, teacher_id, subject_id, class_id, coefficient")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (!assignment) notFound();

  const [teachersRes, subjectsRes, classesRes] = await Promise.all([
    supabaseAdmin
      .from("teachers")
      .select("id, user:user_id(first_name, last_name)")
      .eq("school_id", schoolId)
      .order("user_id"),
    supabaseAdmin
      .from("subjects")
      .select("id, name, code, coefficient")
      .eq("school_id", schoolId)
      .order("name"),
    supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/admin/assignments`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier l&apos;affectation</h1>
      </div>
      <div className="max-w-2xl">
        <TeacherSubjectForm
          teachers={(teachersRes.data || []).map((t: any) => ({
            id: t.id,
            user: Array.isArray(t.user) ? t.user[0] : t.user,
          }))}
          subjects={subjectsRes.data || []}
          classes={classesRes.data || []}
          initialData={assignment as any}
        />
      </div>
    </div>
  );
}
