import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supabaseAdmin = createAdminClient();

    const { data: report, error: reportErr } = await supabaseAdmin
      .from("report_cards")
      .select("pdf_url, student_id, school_id")
      .eq("id", id)
      .single();

    if (reportErr || !report || !report.pdf_url) {
      return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
    }

    const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
      .from("report-cards")
      .download(report.pdf_url);

    if (downloadErr || !fileData) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }

    const pdfBuffer = await fileData.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bulletin-${report.student_id.slice(0, 8)}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Erreur de téléchargement" }, { status: 500 });
  }
}
