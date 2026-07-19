import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { ScheduleView } from "@/components/schedule/schedule-view";

export default async function StudentSchedulePage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "student") redirect(`/${slug}/login`);

  const supabase = createAdminClient();

  const { data: studentRecord } = await supabase
    .from("students")
    .select("id, class_id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!studentRecord) redirect(`/${slug}/student`);

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
    .eq("class_id", studentRecord.class_id)
    .order("day_of_week")
    .order("start_time");

  return <ScheduleView slots={slots || []} title="Mon emploi du temps" />;
}
