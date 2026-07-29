import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  matricule: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  class_id: z.string().uuid().optional(),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: student, error } = await supabase
    .from("students")
    .select(`
      *,
      user:user_id(*),
      class:class_id(*)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: student });
}

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
      .from("students")
      .select("school_id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (validated.first_name || validated.last_name || validated.email) {
      const adminClient = createAdminClient();
      const userUpdate: Record<string, string> = {};
      if (validated.first_name) userUpdate.first_name = validated.first_name;
      if (validated.last_name) userUpdate.last_name = validated.last_name;
      if (validated.email) userUpdate.email = validated.email;
      const { error: userError } = await adminClient.from("users").update(userUpdate).eq("id", existing.user_id);
      if (userError) throw userError;
    }

    const studentUpdate: Record<string, unknown> = {};
    if (validated.matricule) studentUpdate.matricule = validated.matricule;
    if (validated.class_id) studentUpdate.class_id = validated.class_id;
    if (validated.date_of_birth !== undefined) studentUpdate.date_of_birth = validated.date_of_birth;
    if (validated.place_of_birth !== undefined) studentUpdate.place_of_birth = validated.place_of_birth;
    if (validated.gender !== undefined) studentUpdate.gender = validated.gender;

    const { data: updated, error } = await supabase
      .from("students")
      .update(studentUpdate)
      .eq("id", id)
      .eq("school_id", user.school_id)
      .select(`
        *,
        user:user_id(*),
        class:class_id(*)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
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
      .from("students")
      .select("school_id, user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const adminClient = createAdminClient();

    const { error: studentError } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .eq("school_id", user.school_id);

    if (studentError) throw studentError;

    await supabase.from("users").delete().eq("id", existing.user_id);
    await adminClient.auth.admin.deleteUser(existing.user_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}