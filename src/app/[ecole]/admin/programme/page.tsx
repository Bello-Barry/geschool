import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { DeleteProgrammeButton } from "./delete-programme-button";

export const dynamic = "force-dynamic";

export default async function AdminProgrammePage({ params, searchParams }: { params: Promise<{ ecole: string }>; searchParams: Promise<{ subject_id?: string; class_id?: string; term_id?: string }> }) {
  const slug = (await params).ecole;
  const filters = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  const [{ data: subjects }, { data: classes }, { data: terms }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("terms").select("id, name").eq("school_id", schoolId).order("term_number"),
  ]);

  let query = supabase
    .from("programmes")
    .select(`
      id, week_number, topic, learning_objectives, resources, evaluation_method, status, created_at,
      subject:subject_id(id, name, coefficient),
      class:class_id(id, name),
      term:term_id(id, name),
      teacher:created_by(id, user:user_id(first_name, last_name))
    `)
    .eq("school_id", schoolId)
    .order("week_number");

  if (filters.subject_id) query = query.eq("subject_id", filters.subject_id);
  if (filters.class_id) query = query.eq("class_id", filters.class_id);
  if (filters.term_id) query = query.eq("term_id", filters.term_id);

  const { data: entries } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programme pédagogique"
        description="Planification annuelle et trimestrielle des enseignements."
        actions={
          <Button asChild>
            <Link href={`/${slug}/admin/programme/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle entrée
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Matière</label>
            <select name="subject_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={filters.subject_id || ""}>
              <option value="">Toutes</option>
              {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Classe</label>
            <select name="class_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={filters.class_id || ""}>
              <option value="">Toutes</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Trimestre</label>
            <select name="term_id" className="mt-1 block rounded-md border px-3 py-2 text-sm" defaultValue={filters.term_id || ""}>
              <option value="">Tous</option>
              {terms?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Button type="submit" variant="secondary" size="sm">Filtrer</Button>
          {Object.keys(filters).length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${slug}/admin/programme`}>Réinitialiser</Link>
            </Button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Sem.</th>
              <th className="text-left p-3 font-medium">Thème</th>
              <th className="text-left p-3 font-medium">Matière</th>
              <th className="text-left p-3 font-medium">Classe</th>
              <th className="text-left p-3 font-medium">Trimestre</th>
              <th className="text-left p-3 font-medium">Enseignant</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Aucune entrée trouvée. {!filters.subject_id && !filters.class_id && !filters.term_id && "Créez la première entrée du programme."}
                </td>
              </tr>
            )}
            {entries?.map((entry: any) => {
              const teacher = Array.isArray(entry.teacher) ? entry.teacher[0] : entry.teacher;
              const teacherName = teacher?.user?.first_name && teacher?.user?.last_name
                ? `${teacher.user.first_name} ${teacher.user.last_name}`
                : "—";
              return (
                <tr key={entry.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{entry.week_number}</td>
                  <td className="p-3">{entry.topic}</td>
                  <td className="p-3">{entry.subject?.name || "—"}</td>
                  <td className="p-3">{entry.class?.name || "—"}</td>
                  <td className="p-3">{entry.term?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{teacherName}</td>
                  <td className="p-3">
                    <StatusBadge status={entry.status === "published" ? "published" : "draft"} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                        <Link href={`/${slug}/admin/programme/${entry.id}/edit`} aria-label="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteProgrammeButton id={entry.id} slug={slug} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
