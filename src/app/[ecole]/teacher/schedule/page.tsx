import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { ScheduleView } from "@/components/schedule/schedule-view";

export default async function TeacherSchedulePage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

  const supabase = createAdminClient();

  const { data: teacherRecord } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!teacherRecord) redirect(`/${slug}/teacher`);

  const { data: tsList } = await supabase
    .from("teacher_subjects")
    .select("id")
    .eq("teacher_id", teacherRecord.id)
    .eq("school_id", auth.schoolId);

  const tsIds = (tsList || []).map((ts) => ts.id);
  if (tsIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mon emploi du temps</h1>
        <p className="text-muted-foreground">Aucun cours assigné pour le moment.</p>
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
      ),
      class:class_id(id, name)
    `)
    .eq("school_id", auth.schoolId)
    .in("teacher_subject_id", tsIds)
    .order("day_of_week")
    .order("start_time");

  return <ScheduleView slots={slots || []} showClass title="Mon emploi du temps" />;
}
