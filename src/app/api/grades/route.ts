import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const gradeSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  term_id: z.string().uuid(),
  grade_type: z.enum(["homework", "test", "exam"]),
  score: z.number().min(0).max(20),
  date: z.string(),
  comments: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const schoolId = request.headers.get("x-school-id");
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const supabase = createRouteHandlerClient({ cookies });
  const schoolId = request.headers.get("x-school-id");

  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier que c'est un enseignant ou admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "teacher" && user?.role !== "admin_school" && user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

    return NextResponse.json(grade, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
  }
}
