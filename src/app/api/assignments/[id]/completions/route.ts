import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAssignmentType(adminClient: any, assignmentId: string) {
  const { data } = await adminClient
    .from("assignments")
    .select("type, class_id, status, teacher_id")
    .eq("id", assignmentId)
    .single();
  return data;
}

async function verifyTeacher(adminClient: any, userId: string, assignment: any) {
  if (!assignment.teacher_id) return false;
  const { data: teacher } = await adminClient
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .eq("id", assignment.teacher_id)
    .single();
  return !!teacher;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const assignment = await getAssignmentType(adminClient, assignmentId);
  if (!assignment || assignment.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isTdTp = assignment.type === "td" || assignment.type === "tp";

  if (isTdTp) {
    const isTeacher = await verifyTeacher(adminClient, session.user.id, assignment);
    if (!isTeacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const studentId = body.student_id;
    if (!studentId) return NextResponse.json({ error: "student_id required" }, { status: 400 });

    const { data: student } = await adminClient
      .from("students")
      .select("id, class_id")
      .eq("id", studentId)
      .single();
    if (!student || student.class_id !== assignment.class_id) return NextResponse.json({ error: "Invalid student" }, { status: 400 });

    const { data: existing } = await adminClient
      .from("assignment_completions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) return NextResponse.json(existing);

    const { data, error } = await adminClient
      .from("assignment_completions")
      .insert({ assignment_id: assignmentId, student_id: studentId })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // devoir_maison — student toggles self
  const { data: student } = await adminClient
    .from("students")
    .select("id, class_id")
    .eq("user_id", session.user.id)
    .single();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (assignment.class_id !== student.class_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: existing } = await adminClient
    .from("assignment_completions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", student.id)
    .maybeSingle();
  if (existing) return NextResponse.json(existing);

  const { data, error } = await adminClient
    .from("assignment_completions")
    .insert({ assignment_id: assignmentId, student_id: student.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const assignment = await getAssignmentType(adminClient, assignmentId);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isTdTp = assignment.type === "td" || assignment.type === "tp";

  if (isTdTp) {
    const isTeacher = await verifyTeacher(adminClient, session.user.id, assignment);
    if (!isTeacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const studentId = body.student_id;
    if (!studentId) return NextResponse.json({ error: "student_id required" }, { status: 400 });

    const { error } = await adminClient
      .from("assignment_completions")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // devoir_maison — student toggles self
  const { data: student } = await adminClient
    .from("students")
    .select("id")
    .eq("user_id", session.user.id)
    .single();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const { error } = await adminClient
    .from("assignment_completions")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("student_id", student.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
