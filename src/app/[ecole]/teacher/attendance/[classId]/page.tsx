import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";
import { AttendanceForm } from "@/components/forms/attendance-form";

interface PageProps {
  params: Promise<{ ecole: string; classId: string }>;
  searchParams: Promise<{ slot?: string }>;
}

const DAYS_FR: Record<number, string> = { 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi", 7: "Dimanche" };

export default async function TeacherAttendancePage({ params, searchParams }: PageProps) {
  const { ecole: slug, classId } = await params;
  const { slot } = await searchParams;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

  const supabase = createAdminClient();

  const { data: teacherRecord } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  const { count: isAssigned } = await supabase
    .from("teacher_subjects")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherRecord?.id || "")
    .eq("class_id", classId)
    .eq("school_id", auth.schoolId);

  if (!isAssigned || isAssigned === 0) redirect(`/${slug}/teacher`);

  const [classResult, studentsResult] = await Promise.all([
    supabase.from("classes").select("name").eq("id", classId).single(),
    supabase.from("students").select(`
      id,
      matricule,
      user:user_id(first_name, last_name)
    `).eq("class_id", classId).eq("school_id", auth.schoolId).order("last_name", { referencedTable: "user" }),
  ]);

  if (!classResult.data) redirect(`/${slug}/teacher`);

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const isoWeekday = today.getDay() === 0 ? 7 : today.getDay();

  // Créneaux du jour pour cette classe (si l'emploi du temps est défini)
  const { data: teacherSubjects } = await supabase
    .from("teacher_subjects")
    .select("id")
    .eq("teacher_id", teacherRecord?.id || "")
    .eq("school_id", auth.schoolId);

  const myTsIds = (teacherSubjects || []).map((ts: any) => ts.id);

  const { data: todaySlots } = await supabase
    .from("schedule_slots")
    .select(`
      id, start_time, end_time, room_number,
      teacher_subject:teacher_subject_id(subject:subject_id(name))
    `)
    .eq("school_id", auth.schoolId)
    .eq("class_id", classId)
    .eq("day_of_week", isoWeekday)
    .in("teacher_subject_id", myTsIds.length > 0 ? myTsIds : ["00000000-0000-0000-0000-000000000000"])
    .order("start_time");

  // Si un créneau est sélectionné, on vérifie qu'il appartient bien à cette classe ce jour
  let selectedSlot = null;
  let query = supabase
    .from("attendance")
    .select("student_id, status, reason, schedule_slot_id")
    .eq("class_id", classId)
    .eq("date", dateStr);

  if (slot) {
    selectedSlot = (todaySlots || []).find((s: any) => s.id === slot) || null;
    if (!selectedSlot) redirect(`/${slug}/teacher/attendance/${classId}`);
    query = query.eq("schedule_slot_id", slot);
  } else {
    query = query.is("schedule_slot_id", null);
  }

  const { data: existingAttendance } = await query;

  const students = (studentsResult.data || []) as unknown as Array<{
    id: string;
    matricule: string;
    user: { first_name: string; last_name: string } | null;
  }>;

  const existingRecords = ((existingAttendance || []) as Array<{
    student_id: string;
    status: string;
    reason: string | null;
    schedule_slot_id: string | null;
  }>).map(r => ({
    student_id: r.student_id,
    status: r.status as "present" | "absent" | "late" | "excused",
    reason: r.reason,
  }));

  const slotLabel = (s: any) => {
    const subject = (s as any)?.teacher_subject?.subject?.name ?? "Cours";
    const room = s.room_number ? ` · Salle ${s.room_number}` : "";
    return `${s.start_time}–${s.end_time} · ${subject}${room}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${slug}/teacher`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedSlot ? "Appel du créneau" : "Appel du jour"}
          </h1>
          <p className="text-muted-foreground">
            {classResult.data.name} — {formatDate(today)} {DAYS_FR[isoWeekday] ? `(${DAYS_FR[isoWeekday]})` : ""}
          </p>
        </div>
      </div>

      {todaySlots && todaySlots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium inline-flex items-center gap-1.5 mr-1">
            <CalendarClock className="h-4 w-4 text-muted-foreground" /> Créneau :
          </span>
          <Button
            variant={!selectedSlot ? "default" : "outline"}
            size="sm"
            className="text-xs"
            asChild
          >
            <Link href={`/${slug}/teacher/attendance/${classId}`}>Appel du jour</Link>
          </Button>
          {(todaySlots || []).map((s: any) => (
            <Button
              key={s.id}
              variant={selectedSlot?.id === s.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
              asChild
            >
              <Link href={`/${slug}/teacher/attendance/${classId}?slot=${s.id}`}>{slotLabel(s)}</Link>
            </Button>
          ))}
        </div>
      )}

      <AttendanceForm
        classId={classId}
        date={today}
        students={students}
        existingRecords={existingRecords}
        scheduleSlotId={selectedSlot?.id ?? undefined}
        title={selectedSlot ? `Appel du créneau ${slotLabel(selectedSlot)}` : undefined}
      />
    </div>
  );
}