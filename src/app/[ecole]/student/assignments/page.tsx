import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseAttachmentList } from "@/components/courses/course-attachment-list";
import { CompletionToggle } from "@/components/assignments/completion-toggle";
import { MathContent } from "@/components/math/math-content";

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

export default async function StudentAssignmentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
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

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select(`
      id, title, description, type, due_date, status, created_at,
      subject:subject_id(id, name)
    `)
    .eq("class_id", student.class_id)
    .eq("status", "published")
    .order("due_date", { ascending: true });

  const ids = assignments?.map((a) => a.id) || [];

  const { data: allAttachments } = ids.length > 0
    ? await supabaseAdmin
        .from("assignment_attachments")
        .select("*")
        .in("assignment_id", ids)
        .order("created_at")
    : { data: [] };

  const attachmentsByAssignment: Record<string, any[]> = {};
  for (const att of allAttachments || []) {
    const list = attachmentsByAssignment[att.assignment_id] || [];
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("assignment-attachments")
      .createSignedUrl(att.storage_path, 3600);
    list.push({ ...att, signed_url: signedUrlData?.signedUrl || null });
    attachmentsByAssignment[att.assignment_id] = list;
  }

  const { data: completions } = await supabaseAdmin
    .from("assignment_completions")
    .select("assignment_id")
    .eq("student_id", student.id)
    .in("assignment_id", ids);

  const completedIds = new Set(completions?.map((c) => c.assignment_id) || []);

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Devoirs &amp; TD</h1>
        <p className="text-gray-600 mt-2">Travaux à rendre</p>
      </div>

      {(!assignments || assignments.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucun travail à rendre pour le moment</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {assignments?.map((a: any) => {
          const subjectName = Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name;
          const isCompleted = completedIds.has(a.id);
          const dueDate = new Date(a.due_date);
          const isOverdue = !isCompleted && dueDate < now;

          return (
            <Card key={a.id} className={`${isOverdue ? "border-red-300 bg-red-50/30" : isCompleted ? "border-green-300 bg-green-50/30" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeColors[a.type] as any}>{typeLabels[a.type]}</Badge>
                      <Badge variant="outline">{subjectName || "—"}</Badge>
                      {isOverdue && <Badge variant="destructive">En retard</Badge>}
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-600">
                          {a.type === "td" || a.type === "tp" ? "Validé par le professeur" : "Fait"}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      À rendre le {dueDate.toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <CompletionToggle assignmentId={a.id} isCompleted={isCompleted} type={a.type} />
                </div>
              </CardHeader>
              {a.description && (
                <CardContent className="pt-0 pb-3">
                  <MathContent text={a.description} className="mb-3 text-sm text-gray-600" />
                  <CourseAttachmentList attachments={attachmentsByAssignment[a.id] || []} />
                </CardContent>
              )}
              {!a.description && (
                <CardContent className="pt-0 pb-3">
                  <CourseAttachmentList attachments={attachmentsByAssignment[a.id] || []} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
