import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";

export const dynamic = "force-dynamic";

export default async function ParentProgrammePage({ params, searchParams }: { params: Promise<{ ecole: string }>; searchParams: Promise<{ term_id?: string; class_id?: string }> }) {
  const slug = (await params).ecole;
  const filters = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  // 1. Get parent record
  const { data: parentRec } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", schoolId)
    .single();

  if (!parentRec) redirect(`/${slug}/parent`);

  // 2. Get parent's children via student_parents table
  const { data: parentLinks } = await supabase
    .from("student_parents")
    .select(`
      student:student_id(
        id,
        class_id,
        class:class_id(name),
        user:user_id(first_name, last_name)
      )
    `)
    .eq("parent_id", parentRec.id);

  const children = parentLinks
    ?.map((l: any) => {
      const s = unwrapJoin(l.student) as any;
      if (!s) return null;
      const user = unwrapJoin(s.user) as any;
      const classInfo = unwrapJoin(s.class) as any;
      return {
        id: s.id,
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        class_id: s.class_id,
        className: classInfo?.name || "—",
      };
    })
    .filter(Boolean) || [];

  if (children.length === 0) redirect(`/${slug}/parent`);

  const classIds = [...new Set(children.map((c) => c!.class_id).filter(Boolean))];
  const nameOf = (v: any) => (Array.isArray(v) ? v[0]?.name : v?.name) || "—";

  const { data: terms } = await supabase
    .from("terms")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("term_number");

  let entries: any[] = [];

  if (classIds.length > 0) {
    let query = supabase
      .from("programmes")
      .select(`
        id, week_number, topic, learning_objectives, resources, evaluation_method, status, created_at,
        subject:subject_id(id, name, coefficient),
        class:class_id(id, name),
        term:term_id(id, name)
      `)
      .eq("school_id", schoolId)
      .in("class_id", classIds)
      .eq("status", "published")
      .order("week_number");

    if (filters.term_id) query = query.eq("term_id", filters.term_id);
    if (filters.class_id) query = query.eq("class_id", filters.class_id);

    const { data } = await query;
    entries = data || [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Programme pédagogique</h1>
      <p className="text-muted-foreground">
        Programme publié pour {children.map((c) => `${c!.first_name} ${c!.last_name}`).join(", ")}.
      </p>

      <div className="flex flex-wrap gap-4">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Enfant</label>
            <select name="class_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={filters.class_id || ""}>
              <option value="">Tous</option>
              {children.filter((c) => c!.class_id).map((c) => {
                return (
                  <option key={c!.id} value={c!.class_id}>{c!.first_name} {c!.last_name} ({c!.className})</option>
                );
              })}
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

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Sem..</th>
              <th className="text-left p-3 font-medium">Thème</th>
              <th className="text-left p-3 font-medium">Matière</th>
              <th className="text-left p-3 font-medium">Classe</th>
              <th className="text-left p-3 font-medium">Trimestre</th>
              <th className="text-left p-3 font-medium">Objectifs</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Aucun programme publié pour vos enfants.
                </td>
              </tr>
            )}
            {entries.map((entry: any) => (
              <tr key={entry.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{entry.week_number}</td>
                <td className="p-3">{entry.topic}</td>
                <td className="p-3">{nameOf(entry.subject)}</td>
                <td className="p-3">{nameOf(entry.class)}</td>
                <td className="p-3">{nameOf(entry.term)}</td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{entry.learning_objectives || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
