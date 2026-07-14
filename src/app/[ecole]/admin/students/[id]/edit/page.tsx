import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { StudentForm } from "@/components/forms/student-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ ecole: string; id: string }>;
}) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: student } = await supabaseAdmin
    .from("students")
    .select(`
      id,
      matricule,
      date_of_birth,
      place_of_birth,
      gender,
      user:user_id(
        first_name,
        last_name,
        email
      ),
      class_id
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!student) {
    redirect(`/${ecole}/admin/students`);
  }

  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .order("name");

  const userInfo = student.user as unknown as { first_name: string; last_name: string; email: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${ecole}/admin/students/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier l'élève</h1>
          <p className="text-gray-600 mt-1">
            {userInfo?.first_name} {userInfo?.last_name} — {student.matricule}
          </p>
        </div>
      </div>

      <StudentForm
        classes={classes || []}
        initialData={{
          id: student.id,
          matricule: student.matricule,
          firstName: userInfo?.first_name || "",
          lastName: userInfo?.last_name || "",
          email: userInfo?.email || "",
          classId: student.class_id || "",
          dateOfBirth: student.date_of_birth || undefined,
          placeOfBirth: student.place_of_birth || "",
          gender: student.gender as "M" | "F" | undefined,
        }}
      />
    </div>
  );
}