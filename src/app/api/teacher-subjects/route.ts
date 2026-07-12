import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  teacher_id: z.string().uuid("Enseignant requis"),
  subject_id: z.string().uuid("Matière requise"),
  class_id: z.string().uuid("Classe requise"),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (userError) {
    console.error("teacher-subjects POST user lookup failed", {
      message: userError.message,
      code: userError.code,
      details: userError.details,
      hint: userError.hint,
      userId: session.user.id,
    });
  }

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin")) {
    console.error("teacher-subjects POST forbidden", {
      userId: session.user.id,
      role: user?.role,
      schoolId: user?.school_id,
      hasUser: Boolean(user),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const schoolId = user.school_id;

  try {
    const body = await request.json();
    const validated = schema.parse(body);

    // Vérifier les doublons
    const { data: existing } = await supabase
      .from("teacher_subjects")
      .select("id")
      .eq("teacher_id", validated.teacher_id)
      .eq("subject_id", validated.subject_id)
      .eq("class_id", validated.class_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Cet enseignant est déjà assigné à cette matière dans cette classe." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("teacher_subjects")
      .insert({
        teacher_id: validated.teacher_id,
        subject_id: validated.subject_id,
        class_id: validated.class_id,
        school_id: schoolId,
      })
      .select(`
        id,
        teacher:teacher_id(user:user_id(first_name, last_name)),
        subject:subject_id(name, code),
        class:class_id(name)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("teacher-subjects POST failed", {
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
      details: typeof error === "object" && error !== null && "details" in error ? error.details : undefined,
      hint: typeof error === "object" && error !== null && "hint" in error ? error.hint : undefined,
    });
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
