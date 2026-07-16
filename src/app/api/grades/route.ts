import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyParentsOfGrade } from "@/lib/notifications/create";

const gradeSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  term_id: z.string().uuid(),
  grade_type: z.enum(["homework", "test", "exam"]),
  score: z.number().min(0).max(20),
  max_score: z.number().min(1).max(20).default(20),
  date: z.string(),
  comments: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", session.user.id)
    .single();
  const schoolId = userProfile?.school_id;
  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  try {
    let query = supabase
      .from("grades")
      .select(`
        *,
        student:student_id(*),
        subject:subject_id(*),
        term:term_id(*)
      `)
      .eq("school_id", schoolId);

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data: grades, error } = await query;

    if (error) throw error;

    return NextResponse.json(grades);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier que c'est un enseignant ou admin
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
    const validated = gradeSchema.parse(body);

    const { data: grade, error } = await supabase
      .from("grades")
      .insert({
        ...validated,
        school_id: schoolId,
      })
      .select()
      .single();

    if (error) throw error;

    const supabaseAdmin = createAdminClient();
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("name")
      .eq("id", validated.subject_id)
      .single();

    notifyParentsOfGrade(validated.student_id, schoolId, subject?.name || "Matière inconnue", validated.score).catch(
      (err) => console.error("Grade notification error:", err)
    );

    return NextResponse.json(grade, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
  }
}
