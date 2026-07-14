import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { TeacherForm } from "@/components/forms/teacher-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditTeacherPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: teacher } = await supabaseAdmin
    .from("teachers")
    .select(`
      id,
      specialization,
      employee_id,
      hire_date,
      user:user_id(
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!teacher) notFound();

  const userData = teacher.user as unknown as { first_name: string; last_name: string; email: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/teachers/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier l'enseignant</h1>
      </div>

      <div className="max-w-2xl">
        <TeacherForm
          initialData={{
            id: teacher.id,
            firstName: userData?.first_name || "",
            lastName: userData?.last_name || "",
            email: userData?.email || "",
            specialization: teacher.specialization || "",
            employeeId: teacher.employee_id || "",
            hireDate: teacher.hire_date || "",
          }}
        />
      </div>
    </div>
  );
}
