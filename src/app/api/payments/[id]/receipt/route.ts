import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabaseAdmin = createAdminClient();

  const { data: payment, error: payErr } = await supabaseAdmin
    .from("payments")
    .select("receipt_pdf_url, student_id, school_id, amount, status")
    .eq("id", id)
    .single();

  if (payErr || !payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (payment.status !== "confirmed" || !payment.receipt_pdf_url) {
    return NextResponse.json({ error: "Reçu non disponible" }, { status: 404 });
  }

  const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
    .from("receipts")
    .download(payment.receipt_pdf_url);

  if (downloadErr || !fileData) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const pdfBuffer = await fileData.arrayBuffer();

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${payment.student_id.slice(0, 8)}.pdf"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
