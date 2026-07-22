import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ScheduleView } from "@/components/schedule/schedule-view";

export default async function ChildSchedulePage({ params }: { params: Promise<{ ecole: string; studentId: string }> }) {
  const { ecole, studentId } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || auth.role !== "parent") redirect(`/${ecole}/login`);

  const supabase = createAdminClient();

  const parentRecord = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parentRecord.data) redirect(`/${ecole}/parent`);

  const link = await supabase
    .from("student_parents")
    .select("id")
    .eq("parent_id", parentRecord.data.id)
    .eq("student_id", studentId)
    .single();

  if (!link.data) notFound();

  const { data: student } = await supabase
    .from("students")
    .select("id, class_id, user:user_id(first_name, last_name)")
    .eq("id", studentId)
    .single();

  if (!student) notFound();

  const { data: tsList } = await supabase
    .from("teacher_subjects")
    .select("id")
    .eq("class_id", student.class_id)
    .eq("school_id", auth.schoolId);

  const tsIds = (tsList || []).map((ts) => ts.id);
  if (tsIds.length === 0) {
    const user = Array.isArray(student.user) ? student.user[0] : student.user;
    const studentName = user ? `${user.first_name || ""} ${user.last_name || ""}` : "Élève";
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/${ecole}/parent/schedule`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Emploi du temps — {studentName}</h1>
        </div>
        <p className="text-muted-foreground text-sm">Aucun cours programmé</p>
      </div>
    );
  }

  const { data: slots } = await supabase
    .from("schedule_slots")
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      room_number,
      teacher_subject:teacher_subject_id(
        teacher:teacher_id(user:user_id(first_name, last_name)),
        subject:subject_id(id, name, coefficient)
      )
    `)
    .eq("school_id", auth.schoolId)
    .in("teacher_subject_id", tsIds)
    .order("day_of_week")
    .order("start_time");

  const user = Array.isArray(student.user) ? student.user[0] : student.user;
  const studentName = user ? `${user.first_name || ""} ${user.last_name || ""}` : "Élève";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/parent/schedule`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Emploi du temps — {studentName}</h1>
      </div>
      <ScheduleView slots={slots || []} />
    </div>
  );
}
