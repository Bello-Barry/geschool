import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  academic_year_id: z.string().uuid().optional(),
  capacity: z.number().int().positive().optional().nullable(),
  room_number: z.string().optional().nullable(),
});

export async function GET(
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

  const { data: cls, error } = await supabase
    .from("classes")
    .select(`
      *,
      academic_year:academic_year_id(id, name, is_current)
    `)
    .eq("id", id)
    .eq("school_id", user.school_id)
    .single();

  if (error || !cls) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(cls);
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
      .from("classes")
      .select("school_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (validated.name !== undefined) update.name = validated.name;
    if (validated.level !== undefined) update.level = validated.level;
    if (validated.academic_year_id !== undefined) update.academic_year_id = validated.academic_year_id;
    if (validated.capacity !== undefined) update.capacity = validated.capacity;
    if (validated.room_number !== undefined) update.room_number = validated.room_number;

    const { data: updated, error } = await supabase
      .from("classes")
      .update(update)
      .eq("id", id)
      .eq("school_id", user.school_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("PATCH class error:", error);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
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
      .from("classes")
      .select("school_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check for students in this class — FK without CASCADE blocks deletion
    const { count: studentCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", id);

    if (studentCount && studentCount > 0) {
      return NextResponse.json({
        error: `Impossible de supprimer : ${studentCount} élève${studentCount > 1 ? "s" : ""} ${studentCount > 1 ? "sont" : "est"} encore assigné${studentCount > 1 ? "s" : ""} à cette classe.`
      }, { status: 409 });
    }

    const { error: deleteError } = await supabase
      .from("classes")
      .delete()
      .eq("id", id)
      .eq("school_id", user.school_id);

    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE class error:", error);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
