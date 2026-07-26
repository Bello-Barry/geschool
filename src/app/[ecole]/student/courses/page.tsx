import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ ecole: string }>;
  searchParams: Promise<{ q?: string; subject_id?: string }>;
}

export default async function StudentCoursesPage({ params, searchParams }: PageProps) {
  const slug = (await params).ecole;
  const { q, subject_id } = await searchParams;
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

  let courses: any[] = [];

  if (student.class_id) {
    let query = supabaseAdmin
      .from("courses")
      .select(`
        id, title, key_points, status, created_at,
        teacher:teacher_id(id),
        subject:subject_id(id, name),
        class:class_id(id, name)
      `)
      .eq("class_id", student.class_id)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (subject_id) query = query.eq("subject_id", subject_id);

    if (q) {
      query = query.textSearch("search_vector", q, { config: "french" });
    }

    const { data } = await query;
    courses = data || [];
  }

  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .order("name");

  const safeSubjects = subjects || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cours</h1>
        <p className="text-gray-600 mt-2">Consultez les cours de votre classe</p>
      </div>

      <form className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Rechercher un cours..."
            className="pl-10"
          />
        </div>
        <select
          name="subject_id"
          className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={subject_id || ""}
          onChange={(e) => {
            const form = e.target.closest("form");
            if (form) form.submit();
          }}
        >
          <option value="">Toutes les matières</option>
          {safeSubjects.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Button type="submit" variant="secondary" className="sm:w-auto">
          Filtrer
        </Button>
      </form>

      {!student.class_id && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">
              Vous n'avez pas de classe affectée pour le moment. Veuillez contacter l'administration.
            </p>
          </CardContent>
        </Card>
      )}

      {student.class_id && courses.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">
              {q
                ? `Aucun cours trouvé pour "${q}"`
                : "Aucun cours publié pour le moment"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course: any) => {
          const subject = unwrapJoin(course.subject) as any;
          const subjectName = subject?.name;
          return (
            <Card key={course.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <Badge variant="outline">{subjectName || "—"}</Badge>
                </div>
                <CardDescription>
                  {new Date(course.created_at).toLocaleDateString("fr-FR")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {course.key_points && (
                  <div className="text-sm text-gray-600 mb-4 line-clamp-4 whitespace-pre-line">
                    {course.key_points}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
