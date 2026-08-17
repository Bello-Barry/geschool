import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  audience: z.enum(["all", "teachers", "parents", "students"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updates: Record<string, unknown> = {};
    if (validated.title !== undefined) updates.title = validated.title;
    if (validated.content !== undefined) updates.content = validated.content;
    if (validated.audience !== undefined) updates.audience = validated.audience;
    if (validated.status !== undefined) updates.status = validated.status;

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("announcements")
      .update(updates)
      .eq("id", id)
      .eq("school_id", user.school_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("announcements PATCH error:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("school_id", user.school_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("announcements DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}