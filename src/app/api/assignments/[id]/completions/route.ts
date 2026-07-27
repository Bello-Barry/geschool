import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();

  const { data: student } = await adminClient
    .from("students")
    .select("id, class_id")
    .eq("user_id", session.user.id)
    .single();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const { data: assignment } = await adminClient
    .from("assignments")
    .select("class_id, status")
    .eq("id", assignmentId)
    .single();
  if (!assignment || assignment.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: assignmentId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();

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
