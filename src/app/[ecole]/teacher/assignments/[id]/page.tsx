import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TeacherCompletionList } from "@/components/assignments/teacher-completion-list";
import { CourseAttachmentList } from "@/components/courses/course-attachment-list";

const typeLabels: Record<string, string> = {
  devoir_maison: "Devoir maison",
  td: "TD",
  tp: "TP",
};

const typeColors: Record<string, string> = {
  devoir_maison: "default",
  td: "secondary",
  tp: "outline",
};

export default async function TeacherAssignmentDetailPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
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
      id, title, description, type, due_date, status, created_at, class_id,
      subject:subject_id(name),
      class:class_id(name)
    `)
    .eq("id", id)
    .eq("teacher_id", teacherRec.id)
    .single();
  if (!assignment) redirect(`/${slug}/teacher/assignments`);

  const a = assignment as any;
  const subjectName = Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name;
  const className = Array.isArray(a.class) ? a.class[0]?.name : a.class?.name;
  const isTdTp = a.type === "td" || a.type === "tp";

  const { data: students } = await supabaseAdmin
    .from("students")
    .select("id, user:user_id(first_name, last_name)")
    .eq("class_id", a.class_id)
    .order("user_id");

  const studentIds = students?.map((s) => s.id) || [];

  const { data: completions } = studentIds.length > 0
    ? await supabaseAdmin
        .from("assignment_completions")
        .select("student_id")
        .eq("assignment_id", id)
        .in("student_id", studentIds)
    : { data: [] };

  const completedIds = new Set(completions?.map((c) => c.student_id) || []);

  const { data: attachments } = await supabaseAdmin
    .from("assignment_attachments")
    .select("id, name, storage_path, file_type, file_size")
    .eq("assignment_id", id);

  const withUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from("assignment-attachments")
        .createSignedUrl(att.storage_path, 3600);
      return {
        id: att.id,
        file_name: att.name,
        file_type: att.file_type,
        file_size: att.file_size,
        signed_url: signedUrlData?.signedUrl || null,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/teacher/assignments`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{a.title}</h1>
          <p className="text-gray-600 mt-1">
            {subjectName} — {className} • échéance {new Date(a.due_date).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={typeColors[a.type] as any}>{typeLabels[a.type]}</Badge>
          <Badge variant={a.status === "published" ? "default" : "secondary"}>
            {a.status === "published" ? "Publié" : "Brouillon"}
          </Badge>
        </div>
      </div>

      {a.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 whitespace-pre-line">{a.description}</p>
            <CourseAttachmentList attachments={withUrls} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isTdTp ? "Validation des élèves" : "État des élèves"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isTdTp
              ? "Cochez les élèves qui ont effectué ce TD/TP"
              : "Les élèves cochent eux-mêmes leur devoir maison"}
          </p>
        </CardHeader>
        <CardContent>
          <TeacherCompletionList
            assignmentId={id}
            students={(students || []).map((s) => {
              const ss = s as any;
              return {
                id: ss.id,
                firstName: Array.isArray(ss.user) ? ss.user[0]?.first_name : ss.user?.first_name,
                lastName: Array.isArray(ss.user) ? ss.user[0]?.last_name : ss.user?.last_name,
              };
            })}
            completedIds={completedIds}
            isTdTp={isTdTp}
          />
        </CardContent>
      </Card>
    </div>
  );
}