import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";

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

export default async function TeacherAssignmentsPage({ params }: { params: Promise<{ ecole: string }> }) {
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

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select(`
      id, title, type, due_date, status, created_at,
      subject:subject_id(name),
      class:class_id(name)
    `)
    .eq("teacher_id", teacherRec.id)
    .order("due_date", { ascending: true });

  const { data: completions } = await supabaseAdmin
    .from("assignment_completions")
    .select("assignment_id, student_id");

  const completionCounts: Record<string, number> = {};
  for (const c of completions || []) {
    completionCounts[c.assignment_id] = (completionCounts[c.assignment_id] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Devoirs &amp; TD</h1>
          <p className="text-gray-600 mt-2">Créez et gérez les travaux à rendre</p>
        </div>
        <Button asChild>
          <Link href={`/${slug}/teacher/assignments/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau
          </Link>
        </Button>
      </div>

      {(!assignments || assignments.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucun devoir ou TD pour le moment</p>
            <Button asChild className="mt-4">
              <Link href={`/${slug}/teacher/assignments/new`}>Créer un devoir</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {assignments?.map((a: any) => {
          const subjectName = Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name;
          const className = Array.isArray(a.class) ? a.class[0]?.name : a.class?.name;
          const doneCount = completionCounts[a.id] || 0;
          const today = new Date();
          const due = new Date(a.due_date);
          const isOverdue = a.status === "published" && due < today;
          return (
            <Card key={a.id} className={`${isOverdue ? "border-orange-300" : ""}`}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeColors[a.type] as any}>{typeLabels[a.type]}</Badge>
                    <Badge variant={a.status === "published" ? "default" : "secondary"}>
                      {a.status === "published" ? "Publié" : "Brouillon"}
                    </Badge>
                    {isOverdue && <Badge variant="destructive">En retard</Badge>}
                  </div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {subjectName} — {className} • échéance {new Date(a.due_date).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doneCount} élève{doneCount > 1 ? "s" : ""} ont coché "fait"
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="ml-4 shrink-0">
                  <Link href={`/${slug}/teacher/assignments/${a.id}/edit`}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Modifier
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
