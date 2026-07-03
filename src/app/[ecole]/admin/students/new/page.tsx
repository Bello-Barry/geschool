import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "@/components/forms/student-form";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Vérifier l'accès admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "admin_school" && user?.role !== "super_admin") {
    redirect("/teacher");
  }

  // Récupérer les classes disponibles
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  return (
    <div className="max-w-2xl mx-auto">
      <StudentForm classes={classes || []} onSuccess={() => redirect("/admin/students")} />
    </div>
  );
}
