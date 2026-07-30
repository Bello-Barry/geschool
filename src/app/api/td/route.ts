import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  term_id: z.string().uuid().optional().nullable(),
  type: z.enum(["td", "tp"]).default("td"),
  title: z.string().min(1, "Titre requis"),
  session_date: z.string().min(1, "Date requise"),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id, id")
    .eq("id", session.user.id)
    .single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const adminClient = createAdminClient();
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("class_id");
  const teacherId = searchParams.get("teacher_id");
  const studentIdParam = searchParams.get("student_id");

  const isStudentOrParent = user.role === "student" || user.role === "parent";

  let query = adminClient.from("td_sessions").select(`
    *,
    subject:subject_id(name),
    class:class_id(name),
    teacher:teacher_id(id, user:user_id(first_name, last_name))
  `);

  if (user.role === "teacher") {
    const { data: teacherRec } = await adminClient
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("school_id", user.school_id)
      .single();
    if (!teacherRec) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    query = query.eq("teacher_id", teacherRec.id);
  } else if (isStudentOrParent) {
    query = query.eq("status", "published");
  } else if (user.role !== "super_admin" && user.role !== "admin_school") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  query = query.eq("school_id", user.school_id);

  // For students: derive student_id from session, for parents: use query param
  let lookupStudentId = studentIdParam;
  if (user.role === "student" && !lookupStudentId) {
    const { data: studentRec } = await adminClient
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_id", user.school_id)
      .single();
    if (studentRec) lookupStudentId = studentRec.id;
  }

  if (classId) query = query.eq("class_id", classId);
  if (teacherId) query = query.eq("teacher_id", teacherId);

  query = query.order("session_date", { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If student_id is known include their attendance
  if (lookupStudentId && data) {
    const sessionIds = data.map(s => s.id);
    const { data: attendance } = await adminClient
      .from("td_attendance")
      .select("td_session_id, status, marked_at")
      .in("td_session_id", sessionIds)
      .eq("student_id", lookupStudentId);

    const attMap = new Map<string, any>();
    (attendance || []).forEach(a => {
      const arr = attMap.get(a.td_session_id) || [];
      arr.push({ status: a.status, marked_at: a.marked_at });
      attMap.set(a.td_session_id, arr);
    });

    data.forEach(s => {
      (s as any).attendance = attMap.get(s.id) || [];
    });
  }

  return NextResponse.json({ data });
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
    } else {
      teacherId = body.teacher_id;
      if (!teacherId) return NextResponse.json({ error: "teacher_id requis pour admin" }, { status: 400 });
    }

    const { data: sessionRec, error } = await adminClient
      .from("td_sessions")
      .insert({
        school_id: user.school_id,
        teacher_id: teacherId,
        subject_id: validated.subject_id,
        class_id: validated.class_id,
        term_id: validated.term_id || null,
        type: validated.type,
        title: validated.title,
        session_date: validated.session_date,
        description: validated.description || null,
        status: validated.status,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: sessionRec }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}