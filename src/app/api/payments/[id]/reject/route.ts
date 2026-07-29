import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { createNotification } from "@/lib/notifications/create";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();
  const { id } = await params;

  const { data: payment, error: payErr } = await supabaseAdmin
    .from("payments")
    .select("id, status, amount, student_id")
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (payment.status !== "pending") {
    return NextResponse.json({ error: "Ce paiement a déjà été traité" }, { status: 400 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("payments")
    .update({
      status: "rejected",
      confirmed_by: auth.userId,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Notify parents
  const { data: parents } = await supabaseAdmin
    .from("student_parents")
    .select("parent_id")
    .eq("student_id", payment.student_id);

  if (parents && parents.length > 0) {
    const parentIds = parents.map((p) => p.parent_id);
    const { data: parentUsers } = await supabaseAdmin
      .from("parents")
      .select("user_id")
      .in("id", parentIds);

    if (parentUsers) {
      for (const pu of parentUsers) {
        if (pu.user_id) {
          createNotification({
            userId: pu.user_id,
            schoolId: auth.schoolId,
            title: "Paiement rejeté",
            message: `Votre déclaration de paiement de ${payment.amount.toLocaleString("fr-FR")} ₣ a été rejetée. Veuillez contacter l'administration.`,
            type: "error",
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
