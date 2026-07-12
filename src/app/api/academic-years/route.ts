import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  start_date: z.string().min(1, "Date de début requise"),
  end_date: z.string().min(1, "Date de fin requise"),
  is_current: z.boolean().default(false),
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
    console.error("academic-years POST user lookup failed", {
      message: userError.message,
      code: userError.code,
      details: userError.details,
      hint: userError.hint,
      userId: session.user.id,
    });
  }

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin")) {
    console.error("academic-years POST forbidden", {
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

    // Si marquée comme année en cours, désactiver les autres
    if (validated.is_current) {
      await supabase
        .from("academic_years")
        .update({ is_current: false })
        .eq("school_id", schoolId)
        .eq("is_current", true);
    }

    const { data, error } = await supabase
      .from("academic_years")
      .insert({
        school_id: schoolId,
        name: validated.name,
        start_date: validated.start_date,
        end_date: validated.end_date,
        is_current: validated.is_current,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("academic-years POST failed", {
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
      details: typeof error === "object" && error !== null && "details" in error ? error.details : undefined,
      hint: typeof error === "object" && error !== null && "hint" in error ? error.hint : undefined,
    });
    return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 });
  }
}
