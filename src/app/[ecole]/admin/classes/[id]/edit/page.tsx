import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { ClassForm } from "@/components/forms/class-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditClassPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!cls) notFound();

  const { data: academicYears } = await supabaseAdmin
    .from("academic_years")
    .select("id, name, is_current")
    .eq("school_id", auth.schoolId)
    .order("name", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/classes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier la classe</h1>
      </div>

      <div className="max-w-2xl">
        <ClassForm
          academicYears={academicYears || []}
          initialData={{
            id: cls.id,
            name: cls.name,
            level: cls.level,
            academic_year_id: cls.academic_year_id,
            capacity: cls.capacity?.toString() || null,
            room_number: cls.room_number || null,
          }}
        />
      </div>
    </div>
  );
}
