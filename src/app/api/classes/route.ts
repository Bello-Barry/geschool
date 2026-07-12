import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  level: z.string().min(1, "Niveau requis"),
  academic_year_id: z.string().uuid("Année scolaire requise"),
  capacity: z.number().int().positive().optional(),
  room_number: z.string().optional(),
});

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

    const { data, error } = await supabase
      .from("classes")
      .insert({
        school_id: schoolId,
        name: validated.name,
        level: validated.level,
        academic_year_id: validated.academic_year_id,
        capacity: validated.capacity || null,
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
    console.error("classes POST failed", {
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
      details: typeof error === "object" && error !== null && "details" in error ? error.details : undefined,
      hint: typeof error === "object" && error !== null && "hint" in error ? error.hint : undefined,
    });
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
