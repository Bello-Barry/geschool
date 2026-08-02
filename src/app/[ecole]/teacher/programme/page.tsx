import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function TeacherProgrammePage({ params, searchParams }: { params: Promise<{ ecole: string }>; searchParams: Promise<{ term_id?: string; class_id?: string }> }) {
  const slug = (await params).ecole;
  const filters = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: teacherRecord } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", schoolId)
    .single();

  if (!teacherRecord) redirect(`/${slug}/teacher`);

  const { data: tsList } = await supabase
    .from("teacher_subjects")
    .select(`
      id,
      subject:subject_id(id, name, coefficient),
      class:class_id(id, name)
    `)
    .eq("teacher_id", teacherRecord.id)
    .eq("school_id", schoolId);

  const { data: terms } = await supabase
    .from("terms")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("term_number");

  const subjects = tsList || [];
  const classes = [...new Map(tsList?.map((ts: any) => [ts.class?.id, ts.class])).values()].filter(Boolean);

  let query = supabase
    .from("programmes")
    .select(`
      id, week_number, topic, learning_objectives, resources, evaluation_method, status, created_at,
      subject:subject_id(id, name, coefficient),
      class:class_id(id, name),
      term:term_id(id, name)
    `)
    .eq("school_id", schoolId)
    .in("subject_id", (subjects || []).map((s: any) => s.subject?.id).filter(Boolean))
    .order("week_number");

  if (filters.term_id) query = query.eq("term_id", filters.term_id);
  if (filters.class_id) query = query.eq("class_id", filters.class_id);

  const { data: entries } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon programme</h1>
      <p className="text-muted-foreground">Programme pédagogique de mes matières.</p>

      <div className="flex flex-wrap gap-4">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Classe</label>
            <select name="class_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={filters.class_id || ""}>
              <option value="">Toutes</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Trimestre</label>
            <select name="term_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={filters.term_id || ""}>
              <option value="">Tous</option>
              {terms?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Filtrer</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Sem.</th>
              <th className="text-left p-3 font-medium">Thème</th>
              <th className="text-left p-3 font-medium">Matière</th>
              <th className="text-left p-3 font-medium">Classe</th>
              <th className="text-left p-3 font-medium">Trimestre</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-left p-3 font-medium">Objectifs</th>
            </tr>
          </thead>
          <tbody>
            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Aucune entrée de programme pour vos matières.
                </td>
              </tr>
            )}
            {entries?.map((entry: any) => (
              <tr key={entry.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{entry.week_number}</td>
                <td className="p-3">{entry.topic}</td>
                <td className="p-3">{entry.subject?.name || "—"}</td>
                <td className="p-3">{entry.class?.name || "—"}</td>
                <td className="p-3">{entry.term?.name || "—"}</td>
                <td className="p-3">
                  <StatusBadge status={entry.status === "published" ? "published" : "draft"} />
                </td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{entry.learning_objectives || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
