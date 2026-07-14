import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  profession: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
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

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const { data: existing } = await supabase
      .from("parents")
      .select("school_id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (validated.first_name || validated.last_name || validated.email || validated.phone) {
      const adminClient = createAdminClient();
      const userUpdate: Record<string, string> = {};
      if (validated.first_name) userUpdate.first_name = validated.first_name;
      if (validated.last_name) userUpdate.last_name = validated.last_name;
      if (validated.email) userUpdate.email = validated.email;
      if (validated.phone) userUpdate.phone = validated.phone;
      const { error: userError } = await adminClient.from("users").update(userUpdate).eq("id", existing.user_id);
      if (userError) throw userError;
    }

    const parentUpdate: Record<string, unknown> = {};
    if (validated.relationship !== undefined) parentUpdate.relationship = validated.relationship;
    if (validated.profession !== undefined) parentUpdate.profession = validated.profession;

    const { data: updated, error } = await supabase
      .from("parents")
      .update(parentUpdate)
      .eq("id", id)
      .eq("school_id", user.school_id)
      .select(`
        *,
        user:user_id(*)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("PATCH parent error:", error);
    return NextResponse.json({ error: "Failed to update parent" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
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

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data: existing } = await supabase
      .from("parents")
      .select("school_id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const adminClient = createAdminClient();

    const { error: parentError } = await supabase
      .from("parents")
      .delete()
      .eq("id", id)
      .eq("school_id", user.school_id);

    if (parentError) throw parentError;

    await supabase.from("users").delete().eq("id", existing.user_id);
    await adminClient.auth.admin.deleteUser(existing.user_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE parent error:", error);
    return NextResponse.json({ error: "Failed to delete parent" }, { status: 500 });
  }
}
