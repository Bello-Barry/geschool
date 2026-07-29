import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { z } from "zod";

const upsertSchema = z.object({
  class_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  amount: z.number().positive(),
  due_date: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(_request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: fees, error } = await supabaseAdmin
    .from("tuition_fees")
    .select(`
      *,
      class:class_id(id, name),
      academic_year:academic_year_id(id, name)
    `)
    .eq("school_id", auth.schoolId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(fees);
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { class_id, academic_year_id, amount, due_date, description } = parsed.data;

  const { data: existing } = await supabaseAdmin
    .from("tuition_fees")
    .select("id")
    .eq("school_id", auth.schoolId)
    .eq("class_id", class_id)
    .eq("academic_year_id", academic_year_id)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabaseAdmin
      .from("tuition_fees")
      .update({ amount, description, due_date: due_date || null })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from("tuition_fees")
      .insert({
        school_id: auth.schoolId,
        class_id,
        academic_year_id,
        amount,
        description: description || null,
        due_date: due_date || null,
      })
      .select()
      .single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data, { status: existing ? 200 : 201 });
}
