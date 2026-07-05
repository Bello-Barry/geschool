import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { StudentForm } from "@/components/forms/student-form";

export default async function NewStudentPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .order("name");

  return (
    <div className="max-w-2xl mx-auto">
      <StudentForm classes={classes || []} />
    </div>
  );
}