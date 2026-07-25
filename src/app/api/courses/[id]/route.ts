import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  key_points: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  subject_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  term_id: z.string().uuid().optional().nullable(),
  programme_entry_id: z.string().uuid().optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("courses")
    .select(`
      *,
      subject:subject_id(id, name),
      class:class_id(id, name),
      term:term_id(id, name),
      attachments:course_attachments(*)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    const validated = updateSchema.parse(body);

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("courses")
      .select("teacher_id, school_id")
      .eq("id", id)
      .single();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (user.role === "teacher") {
      const { data: teacherRec } = await adminClient
        .from("teachers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      if (!teacherRec || teacherRec.id !== existing.teacher_id)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await adminClient
      .from("courses")
      .update(validated)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("courses PATCH error:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("courses")
    .select("teacher_id, school_id")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "teacher") {
    const { data: teacherRec } = await adminClient
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .single();
    if (!teacherRec || teacherRec.id !== existing.teacher_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await adminClient.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
