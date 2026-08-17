import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (auth.role !== "admin_school" && auth.role !== "super_admin")
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const supabaseAdmin = createAdminClient();
    const termId = request.nextUrl.searchParams.get("term_id");
    const idsParam = request.nextUrl.searchParams.get("ids");

    let query = supabaseAdmin
      .from("report_cards")
      .select(`
        id, general_average, class_rank, total_students, status, generated_at,
        term:term_id(name),
        student:student_id(matricule, user:user_id(first_name, last_name), class:class_id(name))
      `)
      .eq("school_id", auth.schoolId)
      .order("generated_at", { ascending: false });

    if (termId) query = query.eq("term_id", termId);
    if (idsParam) query = query.in("id", idsParam.split(","));

    const { data: reports, error } = await query;
    if (error) throw error;

    const header = ["Élève", "Matricule", "Classe", "Trimestre", "Moyenne/20", "Rang", "Statut", "Généré le"];
    const rows = (reports ?? []).map((rec: any) => {
      const studentInfo = unwrapJoin(rec.student) as {
        matricule: string;
        user: { first_name: string; last_name: string } | null;
        class: { name: string } | null;
      } | null;
      const termInfo = unwrapJoin(rec.term) as { name: string } | null;
      const fullName = studentInfo?.user
        ? `${studentInfo.user.last_name} ${studentInfo.user.first_name}`
        : "";
      return [
        fullName.trim(),
        studentInfo?.matricule ?? "",
        studentInfo?.class?.name ?? "",
        termInfo?.name ?? "",
        rec.general_average != null ? String(rec.general_average).replace(".", ",") : "",
        rec.class_rank != null ? String(rec.class_rank) : "",
        rec.status ?? "",
        rec.generated_at ? new Date(rec.generated_at).toLocaleDateString("fr-FR") : "",
      ];
    });

    const csv = toCsv([header, ...rows]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bulletins-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("reports CSV export error:", error);
    return NextResponse.json({ error: "Erreur lors de l'export CSV" }, { status: 500 });
  }
}