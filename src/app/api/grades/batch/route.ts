import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyParentsOfGrade } from "@/lib/notifications/create";

const batchGradeSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  term_id: z.string().uuid(),
  grades: z.array(z.object({
    grade_type: z.enum(["homework", "test", "exam"]),
    score: z.number().min(0).max(20),
  })),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "teacher" && user?.role !== "admin_school" && user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = user.school_id;

  try {
    const body = await request.json();
    const validated = batchGradeSchema.parse(body);

    const supabaseAdmin = createAdminClient();

    // Le teacher doit être affecté à la classe/matière via teacher_subjects
    if (user.role === "teacher") {
      const allowed = await teacherCanGrade(
        supabaseAdmin,
        session.user.id,
        schoolId,
        validated.student_id,
        validated.subject_id,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Vous n'êtes pas affecté à cette classe/matière" }, { status: 403 });
      }
    }

    // Remove existing grades for this student/subject/term to replace
    await supabaseAdmin
      .from("grades")
      .delete()
      .eq("student_id", validated.student_id)
      .eq("subject_id", validated.subject_id)
      .eq("term_id", validated.term_id);

    if (validated.grades.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const rows = validated.grades.map((g) => ({
      student_id: validated.student_id,
      subject_id: validated.subject_id,
      term_id: validated.term_id,
      school_id: schoolId,
      grade_type: g.grade_type,
      score: g.score,
      max_score: 20,
      date: new Date().toISOString().split("T")[0],
    }));

    const { data, error } = await supabaseAdmin
      .from("grades")
      .insert(rows)
      .select();

    if (error) throw error;

    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("name")
      .eq("id", validated.subject_id)
      .single();

    const mainScore = validated.grades.find((g) => g.grade_type === "exam")
      ?.score ?? validated.grades[0]?.score;

    if (mainScore != null && data && data.length > 0) {
      notifyParentsOfGrade(
        validated.student_id,
        schoolId,
        subject?.name || "Matière inconnue",
        mainScore,
      ).catch((err) => console.error("Batch grade notification error:", err));
    }

    return NextResponse.json({ success: true, count: data?.length ?? 0 }, { status: 201 });
  } catch (error) {
    console.error("Batch grade error:", error);
    if (error instanceof z.ZodError) {
      const flat = error.flatten();
      const messages = Object.values(flat.fieldErrors).flat().filter(Boolean);
      return NextResponse.json({ error: messages.length > 0 ? messages.join("; ") : "Erreur de validation" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save grades" }, { status: 500 });
  }
}

async function teacherCanGrade(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
  schoolId: string,
  studentId: string,
  subjectId: string,
): Promise<boolean> {
  const { data: teacher } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!teacher) return false;

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("class_id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!student?.class_id) return false;

  const { data: assignment } = await supabaseAdmin
    .from("teacher_subjects")
    .select("id")
    .eq("teacher_id", teacher.id)
    .eq("subject_id", subjectId)
    .eq("class_id", student.class_id)
    .eq("school_id", schoolId)
    .maybeSingle();

  return !!assignment;
}