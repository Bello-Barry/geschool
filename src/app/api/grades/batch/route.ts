import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    return NextResponse.json({ success: true, count: data?.length ?? 0 }, { status: 201 });
  } catch (error) {
    console.error("Batch grade error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save grades" }, { status: 500 });
  }
}
