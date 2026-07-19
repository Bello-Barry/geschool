import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  class_id: z.string().uuid("Classe requise"),
  teacher_subject_id: z.string().uuid("Affectation enseignant-matière requise"),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
  room_number: z.string().optional().nullable(),
});

async function checkOverlap(supabase: any, schoolId: string, classId: string, teacherSubjectId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
  let query = supabase
    .from("schedule_slots")
    .select("id, start_time, end_time")
    .eq("school_id", schoolId)
    .eq("day_of_week", dayOfWeek)
    .or(`and(class_id.eq.${classId}),and(teacher_subject_id.eq.${teacherSubjectId})`);

  if (excludeId) query = query.not("id", "eq", excludeId);

  const { data: slots } = await query;

  for (const slot of slots || []) {
    const s = slot.start_time.slice(0, 5);
    const e = slot.end_time.slice(0, 5);
    if (startTime < e && endTime > s) {
      return { conflict: true, message: `Créneau chevauchant avec ${s}-${e} (${dayName(dayOfWeek)})` };
    }
  }
  return null;
}

function dayName(d: number): string {
  return ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][d] || "";
}

export async function POST(request: NextRequest) {
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
  const schoolId = user.school_id;

  try {
    const body = await request.json();
    const validated = schema.parse(body);

    if (validated.start_time >= validated.end_time) {
      return NextResponse.json({ error: "L'heure de début doit être antérieure à l'heure de fin" }, { status: 400 });
    }

    const overlap = await checkOverlap(supabase, schoolId, validated.class_id, validated.teacher_subject_id, validated.day_of_week, validated.start_time, validated.end_time);
    if (overlap) {
      return NextResponse.json({ error: overlap.message }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("schedule_slots")
      .insert({
        school_id: schoolId,
        class_id: validated.class_id,
        teacher_subject_id: validated.teacher_subject_id,
        day_of_week: validated.day_of_week,
        start_time: validated.start_time,
        end_time: validated.end_time,
        room_number: validated.room_number || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("schedule-slots POST failed", {
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
    });
    return NextResponse.json({ error: "Erreur lors de la création du créneau" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("class_id");
  const dayOfWeek = searchParams.get("day_of_week");

  let query = supabase
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
    .eq("school_id", user.school_id);

  if (classId) query = query.eq("class_id", classId);
  if (dayOfWeek !== null && dayOfWeek !== undefined) query = query.eq("day_of_week", parseInt(dayOfWeek));

  query = query.order("day_of_week").order("start_time");

  const { data, error } = await query;

  if (error) {
    console.error("schedule-slots GET failed", error);
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
