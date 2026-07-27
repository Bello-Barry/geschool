import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["devoir_maison", "td", "tp"]).optional(),
  due_date: z.string().optional(),
  subject_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  term_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("assignments")
    .select(`
      *,
      subject:subject_id(id, name),
      class:class_id(id, name),
      term:term_id(id, name)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: completions } = await adminClient
    .from("assignment_completions")
    .select("id, student_id, completed_at")
    .eq("assignment_id", id);

  const { data: attachments } = await adminClient
    .from("assignment_attachments")
    .select("*")
    .eq("assignment_id", id)
    .order("created_at");

  const withUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data: signedUrlData } = await adminClient.storage
        .from("assignment-attachments")
        .createSignedUrl(att.storage_path, 3600);
      return { ...att, signed_url: signedUrlData?.signedUrl || null };
    })
  );

  return NextResponse.json({ ...data, completions: completions || [], attachments: withUrls || [] });
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
      .from("assignments")
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
      .from("assignments")
      .update(validated)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("assignments PATCH error:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
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
    .from("assignments")
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

  const { data: attachments } = await adminClient
    .from("assignment_attachments")
    .select("storage_path")
    .eq("assignment_id", id);

  if (attachments && attachments.length > 0) {
    await adminClient.storage
      .from("assignment-attachments")
      .remove(attachments.map((a) => a.storage_path));
  }

  const { error } = await adminClient.from("assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
