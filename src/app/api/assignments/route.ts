import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  term_id: z.string().uuid().optional().nullable(),
  type: z.enum(["devoir_maison"]),
  title: z.string().min(1, "Titre requis"),
  description: z.string().optional().default(""),
  due_date: z.string().min(1, "Date d'échéance requise"),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

export async function POST(request: NextRequest) {
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
    const validated = createSchema.parse(body);

    const adminClient = createAdminClient();

    let teacherId: string;
    if (user.role === "teacher") {
      const { data: teacherRec } = await adminClient
        .from("teachers")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("school_id", user.school_id)
        .single();
      if (!teacherRec) return NextResponse.json({ error: "Enseignant introuvable" }, { status: 404 });
      teacherId = teacherRec.id;

      const { count } = await adminClient
        .from("teacher_subjects")
        .select("id", { count: "exact" })
        .eq("teacher_id", teacherId)
        .eq("subject_id", validated.subject_id)
        .eq("class_id", validated.class_id);
      if (!count || count === 0)
        return NextResponse.json({ error: "Vous n'êtes pas assigné à cette classe/matière" }, { status: 403 });
    } else {
      teacherId = body.teacher_id;
      if (!teacherId) return NextResponse.json({ error: "teacher_id requis" }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("assignments")
      .insert({
        school_id: user.school_id,
        teacher_id: teacherId,
        subject_id: validated.subject_id,
        class_id: validated.class_id,
        term_id: validated.term_id || null,
        type: validated.type,
        title: validated.title,
        description: validated.description,
        due_date: validated.due_date,
        status: validated.status,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("assignments POST error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
