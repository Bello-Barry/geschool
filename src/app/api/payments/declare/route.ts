import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { z } from "zod";

const declareSchema = z.object({
  student_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(["cash", "mobile_money", "bank_transfer", "check"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  monthly_due_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = declareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // Verify parent owns this child
  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) {
    return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
  }

  const { data: link } = await supabaseAdmin
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id)
    .eq("student_id", parsed.data.student_id)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Cet élève n'est pas votre enfant" }, { status: 403 });
  }

  // Get current academic year
  const { data: currentAY } = await supabaseAdmin
    .from("academic_years")
    .select("id")
    .eq("school_id", auth.schoolId)
    .eq("is_current", true)
    .maybeSingle();

  // If a monthly due is provided, validate it belongs to the student and school
  let monthlyDueId: string | null = parsed.data.monthly_due_id || null;
  if (monthlyDueId) {
    const { data: due } = await supabaseAdmin
      .from("monthly_dues")
      .select("id, school_id, student_id, status")
      .eq("id", monthlyDueId)
      .single();

    if (!due || due.school_id !== auth.schoolId || due.student_id !== parsed.data.student_id) {
      return NextResponse.json({ error: "Échéance invalide" }, { status: 400 });
    }
    if (due.status === "paid") {
      return NextResponse.json({ error: "Cette échéance est déjà payée" }, { status: 400 });
    }
  }

  const payment = await supabaseAdmin
    .from("payments")
    .insert({
      student_id: parsed.data.student_id,
      school_id: auth.schoolId,
      academic_year_id: currentAY?.id || null,
      monthly_due_id: monthlyDueId,
      amount: parsed.data.amount,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: parsed.data.payment_method,
      reference_number: parsed.data.reference_number || null,
      notes: parsed.data.notes || null,
      status: "pending",
      declared_by: auth.userId,
    })
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(name)
      )
    `)
    .single();

  if (payment.error) return NextResponse.json({ error: payment.error.message }, { status: 500 });
  return NextResponse.json(payment.data, { status: 201 });
}
