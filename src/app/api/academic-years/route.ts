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

    // Auto-create 3 trimesters split evenly across the academic year
    const start = new Date(validated.start_date);
    const end = new Date(validated.end_date);
    const totalMs = end.getTime() - start.getTime();
    const thirdMs = totalMs / 3;

    const termNames = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];
    const terms = termNames.map((name, i) => {
      const tStart = new Date(start.getTime() + thirdMs * i);
      const tEnd = new Date(start.getTime() + thirdMs * (i + 1));
      return {
        academic_year_id: data.id,
        school_id: schoolId,
        name,
        term_number: i + 1,
        start_date: tStart.toISOString().split("T")[0],
        end_date: tEnd.toISOString().split("T")[0],
        is_current: false,
      };
    });

    const { error: termsError } = await supabase.from("terms").insert(terms);
    if (termsError) {
      console.error("Failed to create terms for academic year", {
        message: termsError.message,
        code: termsError.code,
      });
    }

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
