import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  class_id: z.string().uuid().optional(),
  teacher_subject_id: z.string().uuid().optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  room_number: z.string().optional().nullable(),
});

function dayName(d: number): string {
  return ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][d] || "";
}

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

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: slot, error } = await supabase
    .from("schedule_slots")
    .select(`
      *,
      class:class_id(id, name),
      teacher_subject:teacher_subject_id(
        id,
        teacher:teacher_id(id, user:user_id(first_name, last_name)),
        subject:subject_id(id, name, coefficient)
      )
    `)
    .eq("id", id)
    .eq("school_id", user.school_id)
    .single();

  if (error || !slot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(slot);
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
      .from("schedule_slots")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const startTime = validated.start_time || existing.start_time;
    const endTime = validated.end_time || existing.end_time;
    if (startTime >= endTime) {
      return NextResponse.json({ error: "L'heure de début doit être antérieure à l'heure de fin" }, { status: 400 });
    }

    const classId = validated.class_id || existing.class_id;
    const teacherSubjectId = validated.teacher_subject_id || existing.teacher_subject_id;
    const dayOfWeek = validated.day_of_week ?? existing.day_of_week;

    const { data: slots } = await supabase
      .from("schedule_slots")
      .select("id, start_time, end_time")
      .eq("school_id", user.school_id)
      .eq("day_of_week", dayOfWeek)
      .or(`and(class_id.eq.${classId}),and(teacher_subject_id.eq.${teacherSubjectId})`)
      .not("id", "eq", id);

    for (const slot of slots || []) {
      const s = slot.start_time.slice(0, 5);
      const e = slot.end_time.slice(0, 5);
      if (startTime.slice(0, 5) < e && endTime.slice(0, 5) > s) {
        return NextResponse.json({ error: `Créneau chevauchant avec ${s}-${e} (${dayName(dayOfWeek)})` }, { status: 409 });
      }
    }

    const update: Record<string, unknown> = {};
    if (validated.class_id !== undefined) update.class_id = validated.class_id;
    if (validated.teacher_subject_id !== undefined) update.teacher_subject_id = validated.teacher_subject_id;
    if (validated.day_of_week !== undefined) update.day_of_week = validated.day_of_week;
    if (validated.start_time !== undefined) update.start_time = validated.start_time;
    if (validated.end_time !== undefined) update.end_time = validated.end_time;
    if (validated.room_number !== undefined) update.room_number = validated.room_number;
    update.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("schedule_slots")
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
    console.error("PATCH schedule-slot error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
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
      .from("schedule_slots")
      .select("school_id")
      .eq("id", id)
      .single();

    if (!existing || existing.school_id !== user.school_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("schedule_slots")
      .delete()
      .eq("id", id)
      .eq("school_id", user.school_id);

    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE schedule-slot error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
