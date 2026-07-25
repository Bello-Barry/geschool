import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  term_id: z.string().uuid().optional().nullable(),
  programme_entry_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Titre requis"),
  key_points: z.string().optional().default(""),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const classId = searchParams.get("class_id");
  const subjectId = searchParams.get("subject_id");

  let query = adminClient
    .from("courses")
    .select(`
      *,
      teacher:teacher_id(id),
      subject:subject_id(id, name),
      class:class_id(id, name),
      term:term_id(id, name)
    `)
    .eq("school_id", user.school_id);

  if (classId) query = query.eq("class_id", classId);
  if (subjectId) query = query.eq("subject_id", subjectId);

  // Teacher sees own courses + published; student sees published only
  if (user.role === "teacher") {
    const { data: teacherRec } = await adminClient
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .single();
    if (teacherRec) {
      query = query.or(`teacher_id.eq.${teacherRec.id},status.eq.published`);
    }
  } else if (user.role === "student") {
    query = query.eq("status", "published");
    const { data: studentRec } = await adminClient
      .from("students")
      .select("class_id")
      .eq("user_id", session.user.id)
      .single();
    if (studentRec) query = query.eq("class_id", studentRec.class_id);
  } else if (user.role === "parent") {
    query = query.eq("status", "published");
  }

  query = query.order("created_at", { ascending: false });

  if (q) {
    query = query.textSearch("search_vector", q, { config: "french" });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();
  if (!user || (user.role !== "teacher" && user.role !== "admin_school" && user.role !== "super_admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const validated = createSchema.parse(body);

    const adminClient = createAdminClient();

    let teacherId: string;
    if (user.role === "teacher") {
      const { data: teacherRec } = await adminClient
        .from("teachers")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("school_id", user.school_id)
        .single();
      if (!teacherRec) return NextResponse.json({ error: "Enseignant introuvable" }, { status: 404 });
      teacherId = teacherRec.id;

      const { count } = await adminClient
        .from("teacher_subjects")
        .select("id", { count: "exact" })
        .eq("teacher_id", teacherId)
        .eq("subject_id", validated.subject_id)
        .eq("class_id", validated.class_id);
      if (!count || count === 0)
        return NextResponse.json({ error: "Vous n'êtes pas assigné à cette classe/matière" }, { status: 403 });
    } else {
      teacherId = body.teacher_id;
      if (!teacherId) return NextResponse.json({ error: "teacher_id requis" }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("courses")
      .insert({
        school_id: user.school_id,
        teacher_id: teacherId,
        subject_id: validated.subject_id,
        class_id: validated.class_id,
        term_id: validated.term_id || null,
        programme_entry_id: validated.programme_entry_id || null,
        title: validated.title,
        key_points: validated.key_points,
        status: validated.status,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("courses POST error:", error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
