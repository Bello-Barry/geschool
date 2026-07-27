import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default async function AdminDevoirsPage({ params, searchParams }: {
  params: Promise<{ ecole: string }>;
  searchParams: Promise<{ class_id?: string; type?: string }>;
}) {
  const slug = (await params).ecole;
  const filters = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from("assignments")
    .select(`
      id, title, type, due_date, status, created_at,
      subject:subject_id(id, name),
      class:class_id(id, name),
      teacher:teacher_id(id)
    `)
    .eq("school_id", auth.schoolId)
    .order("due_date", { ascending: false });

  if (filters.class_id) query = query.eq("class_id", filters.class_id);
  if (filters.type) query = query.eq("type", filters.type);

  const { data: assignments } = await query;

  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .order("name");

  const { data: completions } = await supabaseAdmin
    .from("assignment_completions")
    .select("assignment_id, student_id");

  const completionCounts: Record<string, number> = {};
  for (const c of completions || []) {
    completionCounts[c.assignment_id] = (completionCounts[c.assignment_id] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Devoirs &amp; TD</h1>
        <p className="text-muted-foreground">Tous les devoirs et travaux de l&apos;établissement</p>
      </div>

      <form className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Classe</label>
          <select name="class_id" className="mt-1 block rounded-md border px-3 py-2 text-sm"
            defaultValue={filters.class_id || ""}>
            <option value="">Toutes les classes</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Type</label>
          <select name="type" className="mt-1 block rounded-md border px-3 py-2 text-sm"
            defaultValue={filters.type || ""}>
            <option value="">Tous les types</option>
            <option value="devoir_maison">Devoir maison</option>
            <option value="td">TD</option>
            <option value="tp">TP</option>
          </select>
        </div>
        <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Filtrer
        </button>
      </form>

      {(!assignments || assignments.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucun devoir ou TD créé pour le moment</p>
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
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
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
                <p className="text-xs text-muted-foreground mt-1">
                  {doneCount} élève{doneCount > 1 ? "s" : ""} ont coché "fait"
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
