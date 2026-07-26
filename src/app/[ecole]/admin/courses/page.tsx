import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoursesClient } from "./courses-client";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) {
    redirect(`/${slug}/login`);
  }

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  // 1. Get all courses with joins
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id, title, key_points, status, created_at,
      class:class_id(id, name),
      subject:subject_id(id, name),
      teacher:teacher_id(
        id,
        user:user_id(first_name, last_name)
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  // 2. Get classes for filtering
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  // 3. Get subjects for filtering
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  // 4. Get teachers for filtering
  const { data: teachers } = await supabase
    .from("teachers")
    .select(`
      id,
      user:user_id(first_name, last_name)
    `)
    .eq("school_id", schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modération des cours</h1>
        <p className="text-gray-600 mt-2">
          Consultez et gérez tous les cours de l'établissement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste de tous les cours</CardTitle>
          <CardDescription>
            Filtrer et modérer/supprimer les contenus publiés par les enseignants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoursesClient
            initialCourses={courses || []}
            classes={classes || []}
            subjects={subjects || []}
            teachers={teachers || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
