import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";

export const dynamic = "force-dynamic";

export default async function ParentChildProgrammePage({
  params,
  searchParams,
}: {
  params: Promise<{ ecole: string; studentId: string }>;
  searchParams: Promise<{ term_id?: string }>;
}) {
  const { ecole: slug, studentId } = await params;
  const { term_id } = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  // 1. Get parent record
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", schoolId)
    .single();
  if (!parent) redirect(`/${slug}/parent/children`);

  // 2. Validate child association
  const { data: link } = await supabase
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id)
    .eq("student_id", studentId)
    .single();
  if (!link) redirect(`/${slug}/parent/children`);

  // 3. Get child record and their class info
  const { data: student } = await supabase
    .from("students")
    .select("id, class_id, matricule, user:user_id(first_name, last_name), class:class_id(id, name)")
    .eq("id", studentId)
    .single();
  if (!student) redirect(`/${slug}/parent/children`);

  const userInfo = unwrapJoin(student.user) as { first_name: string; last_name: string } | null;
  const classInfo = unwrapJoin(student.class) as { id: string; name: string } | null;

  const { data: terms } = await supabase
    .from("terms")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("term_number");

  let entries: any[] = [];
  if (student.class_id) {
    let query = supabase
      .from("programmes")
      .select(`
        id, week_number, topic, learning_objectives, resources, evaluation_method, status, created_at,
        subject:subject_id(id, name, coefficient),
        class:class_id(id, name),
        term:term_id(id, name)
      `)
      .eq("school_id", schoolId)
      .eq("class_id", student.class_id)
      .eq("status", "published")
      .order("week_number");

    if (term_id) query = query.eq("term_id", term_id);

    const { data } = await query;
    entries = data || [];
  }

  const nameOf = (v: any) => (Array.isArray(v) ? v[0]?.name : v?.name) || "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Programme de {userInfo?.first_name} {userInfo?.last_name}</h1>
        <p className="text-gray-600 mt-2">
          Programme pédagogique publié pour la classe de {classInfo?.name || "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Trimestre</label>
            <select name="term_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={term_id || ""}>
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
              <th className="text-left p-3 font-medium">Sem.</th>
              <th className="text-left p-3 font-medium">Thème</th>
              <th className="text-left p-3 font-medium">Matière</th>
              <th className="text-left p-3 font-medium">Trimestre</th>
              <th className="text-left p-3 font-medium">Objectifs</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Aucun programme publié pour cette classe.
                </td>
              </tr>
            )}
            {entries.map((entry: any) => (
              <tr key={entry.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{entry.week_number}</td>
                <td className="p-3">{entry.topic}</td>
                <td className="p-3">{nameOf(entry.subject)}</td>
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
