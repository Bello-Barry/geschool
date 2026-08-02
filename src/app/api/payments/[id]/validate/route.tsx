import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { generatePDFBuffer } from "@/lib/utils/pdf-generator";
import ReceiptPDF from "@/components/pdf/receipt-template";
import { createNotification } from "@/lib/notifications/create";
import { formatCurrency } from "@/lib/utils/format-currency";

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
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(id, name),
        matricule,
        school_id
      )
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (payment.status !== "pending") {
    return NextResponse.json({ error: "Ce paiement a déjà été traité" }, { status: 400 });
  }

  const student = payment.student as any;
  const userInfo = student?.user as any;
  const classInfo = student?.class as any;

  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("name, address, phone")
    .eq("id", auth.schoolId)
    .single();

  let academicYearLabel = "N/A";
  if (payment.academic_year_id) {
    const { data: ay } = await supabaseAdmin
      .from("academic_years")
      .select("name")
      .eq("id", payment.academic_year_id)
      .single();
    if (ay) academicYearLabel = ay.name;
  }

  const now = new Date();
  const receiptNumber = `REC-${now.getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
  const methodLabels: Record<string, string> = {
    cash: "Espèces",
    mobile_money: "Mobile Money",
    bank_transfer: "Virement bancaire",
    check: "Chèque",
  };

  const receiptData = {
    schoolName: school?.name || "École",
    schoolAddress: school?.address || undefined,
    schoolPhone: school?.phone || undefined,
    studentName: `${userInfo?.first_name || ""} ${userInfo?.last_name || ""}`.trim(),
    studentMatricule: student?.matricule || "",
    className: classInfo?.name || "",
    amount: payment.amount,
    paymentMethod: methodLabels[payment.payment_method as string] || payment.payment_method || "N/A",
    paymentDate: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("fr-FR") : "",
    receiptNumber,
    academicYear: academicYearLabel,
    generatedAt: now.toLocaleDateString("fr-FR"),
  };

  const pdfBuffer = await generatePDFBuffer(<ReceiptPDF data={receiptData} />);

  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === "receipts");
  if (!bucketExists) {
    await supabaseAdmin.storage.createBucket("receipts", {
      public: false,
      allowedMimeTypes: ["application/pdf"],
    });
  }

  const filePath = `${auth.schoolId}/${payment.student_id}/${id}.pdf`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from("receipts")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_by: auth.userId,
      confirmed_at: now.toISOString(),
      receipt_pdf_url: filePath,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Mark the linked monthly due as paid
  if (payment.monthly_due_id) {
    await supabaseAdmin
      .from("monthly_dues")
      .update({ status: "paid" })
      .eq("id", payment.monthly_due_id)
      .eq("school_id", auth.schoolId);
  }

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
      const receiptUrl = `/api/payments/${id}/receipt`;
      for (const pu of parentUsers) {
        if (pu.user_id) {
          createNotification({
            userId: pu.user_id,
            schoolId: auth.schoolId,
            title: "Paiement confirmé",
            message: `Votre paiement de ${formatCurrency(payment.amount)} a été confirmé. Téléchargez votre reçu.`,
            type: "success",
            link: receiptUrl,
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json(updated);
}
