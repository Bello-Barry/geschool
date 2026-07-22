import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ScheduleForm } from "@/components/forms/schedule-form";

export default async function EditSchedulePage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: slot } = await supabase
    .from("schedule_slots")
    .select("*")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (!slot) notFound();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  const { data: teacherSubjects } = await supabase
    .from("teacher_subjects")
    .select(`
      id,
      teacher:teacher_id(user:user_id(first_name, last_name)),
      subject:subject_id(id, name),
      class:class_id(id, name)
    `)
    .eq("school_id", schoolId);

  const mapped = (teacherSubjects || []).map((ts: any) => ({
    id: ts.id,
    teacher_name: ts.teacher?.user?.first_name && ts.teacher?.user?.last_name
      ? `${ts.teacher.user.first_name} ${ts.teacher.user.last_name}`
      : "Enseignant inconnu",
    subject_name: ts.subject?.name || "Matière inconnue",
    class_name: ts.class?.name || "Classe inconnue",
    class_id: ts.class?.id || "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/schedule`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier le créneau</h1>
      </div>
      <div className="max-w-2xl">
        <ScheduleForm
          classes={classes || []}
          teacherSubjects={mapped}
          initialData={{
            id: slot.id,
            class_id: slot.class_id,
            teacher_subject_id: slot.teacher_subject_id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            room_number: slot.room_number,
          }}
        />
      </div>
    </div>
  );
}
