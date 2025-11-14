import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paymentSchema = z.object({
  student_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string(),
  payment_method: z.enum(["cash", "mobile_money", "bank_transfer", "check"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const schoolId = request.headers.get("x-school-id");
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let query = supabase
      .from("payments")
      .select(`
        *,
        student:student_id(
          user:user_id(first_name, last_name),
          matricule
        ),
        academic_year:academic_year_id(name)
      `)
      .eq("school_id", schoolId);

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data: payments, error } = await query.order("payment_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(payments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const schoolId = request.headers.get("x-school-id");

  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier que c'est un admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "admin_school" && user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = paymentSchema.parse(body);

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        ...validated,
        school_id: schoolId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
