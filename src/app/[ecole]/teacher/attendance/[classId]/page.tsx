import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";
import { AttendanceForm } from "@/components/forms/attendance-form";

interface PageProps {
  params: Promise<{ ecole: string; classId: string }>;
}

export default async function TeacherAttendancePage({ params }: PageProps) {
  const { ecole: slug, classId } = await params;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

  const supabase = await createClient();

  const { data: teacherRecord } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .single();

  const { count: isAssigned } = await supabase
    .from("teacher_subjects")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherRecord?.id || "")
    .eq("class_id", classId);

  if (!isAssigned || isAssigned === 0) redirect(`/${slug}/teacher`);

  const [classResult, studentsResult] = await Promise.all([
    supabase.from("classes").select("name").eq("id", classId).single(),
    supabase.from("students").select(`
      id,
      matricule,
      user:user_id(first_name, last_name)
    `).eq("class_id", classId).order("user(last_name)", { ascending: true }),
  ]);

  if (!classResult.data) redirect(`/${slug}/teacher`);

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const { data: existingAttendance } = await supabase
    .from("attendance")
    .select("student_id, status, reason")
    .eq("class_id", classId)
    .eq("date", dateStr);

  const students = (studentsResult.data || []) as unknown as Array<{
    id: string;
    matricule: string;
    user: { first_name: string; last_name: string } | null;
  }>;

  const existingRecords = ((existingAttendance || []) as Array<{
    student_id: string;
    status: string;
    reason: string | null;
  }>).map(r => ({
    student_id: r.student_id,
    status: r.status as "present" | "absent" | "late" | "excused",
    reason: r.reason,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${slug}/teacher`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appel du jour</h1>
          <p className="text-muted-foreground">
            {classResult.data.name} — {formatDate(today)}
          </p>
        </div>
      </div>

      <AttendanceForm
        classId={classId}
        date={today}
        students={students}
        existingRecords={existingRecords}
      />
    </div>
  );
}
