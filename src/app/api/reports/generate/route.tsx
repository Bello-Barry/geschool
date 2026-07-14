import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePDFBuffer } from "@/lib/utils/pdf-generator";
import ReportCardPDF, { type ReportCardData } from "@/components/pdf/report-card-template";
import { z } from "zod";

const reportSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  type: z.enum(["report_card", "receipt"]).default("report_card"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: caller } = await supabase
      .from("users")
      .select("id, school_id, role")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin_school" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const validation = reportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { studentId, termId } = validation.data;

    const supabaseAdmin = createAdminClient();

    // 1. Ensure storage bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "report-cards");
    if (!bucketExists) {
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket("report-cards", {
        public: false,
        allowedMimeTypes: ["application/pdf"],
      });
      if (bucketErr) throw new Error(`Bucket creation failed: ${bucketErr.message}`);
    }

    // 2. Fetch student + school + class
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("students")
      .select(`
        id, school_id, class_id, matricule,
        user:user_id(first_name, last_name),
        class:class_id(id, name, level)
      `)
      .eq("id", studentId)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });
    }

    if (caller.role !== "super_admin" && student.school_id !== caller.school_id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data: school, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .select("name, address, phone, logo_url, primary_color")
      .eq("id", student.school_id)
      .single();

    if (schoolErr || !school) {
      return NextResponse.json({ error: "École introuvable" }, { status: 404 });
    }

    // 3. Fetch term
    const { data: term, error: termErr } = await supabaseAdmin
      .from("terms")
      .select("id, name, academic_year_id")
      .eq("id", termId)
      .single();

    if (termErr || !term) {
      return NextResponse.json({ error: "Trimestre introuvable" }, { status: 404 });
    }

    // 4. Fetch academic year
    let academicYearLabel = "";
    if (term.academic_year_id) {
      const { data: ay } = await supabaseAdmin
        .from("academic_years")
        .select("name")
        .eq("id", term.academic_year_id)
        .single();
      if (ay) academicYearLabel = ay.name;
    }

    // 5. Fetch subjects for this school
    const { data: classSubjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name, coefficient")
      .eq("school_id", student.school_id)
      .order("name");

    if (!classSubjects || classSubjects.length === 0) {
      return NextResponse.json({ error: "Aucune matière trouvée" }, { status: 404 });
    }

    // 6. Calculate averages per subject using SQL function
    const subjectAverages: ReportCardData["subjectAverages"] = [];

    for (const sub of classSubjects) {
      const { data: avgData } = await supabaseAdmin.rpc("calculate_subject_average", {
        p_student_id: studentId,
        p_subject_id: sub.id,
        p_term_id: termId,
      });

      const avg = typeof avgData === "number" ? avgData : 0;
      subjectAverages.push({
        subjectName: sub.name,
        coefficient: sub.coefficient ?? 1,
        average: avg,
        maxScore: 20,
        appreciation: "",
      });
    }

    // 7. Calculate general average (weighted)
    let totalWeighted = 0;
    let totalCoeff = 0;
    for (const sa of subjectAverages) {
      totalWeighted += sa.average * sa.coefficient;
      totalCoeff += sa.coefficient;
    }
    const generalAverage = totalCoeff > 0 ? totalWeighted / totalCoeff : 0;

    // 8. Calculate class rank
    let classRank: number | undefined;
    let totalStudents: number | undefined;

    if (student.class_id) {
      const { data: rankData } = await supabaseAdmin.rpc("calculate_class_rank", {
        p_student_id: studentId,
        p_term_id: termId,
        p_class_id: student.class_id,
      });

      if (rankData && Array.isArray(rankData) && rankData.length > 0) {
        classRank = rankData[0].rank;
        totalStudents = rankData[0].total_students;
      }
    }

    const classInfo = student.class as unknown as { id: string; name: string; level?: string } | null;
    const userInfo = student.user as unknown as { first_name: string; last_name: string } | null;

    // 9. Build PDF data
    const now = new Date();
    const reportData: ReportCardData = {
      schoolName: school.name,
      schoolAddress: school.address || undefined,
      schoolPhone: school.phone || undefined,
      studentName: `${userInfo?.first_name ?? ""} ${userInfo?.last_name ?? ""}`.trim(),
      studentMatricule: student.matricule ?? "",
      className: classInfo?.name ?? "",
      termName: term.name,
      academicYear: academicYearLabel,
      subjectAverages,
      generalAverage: Math.round(generalAverage * 100) / 100,
      classRank,
      totalStudents,
      generatedAt: now.toLocaleDateString("fr-FR"),
    };

    // 10. Generate PDF
    const pdfBuffer = await generatePDFBuffer(<ReportCardPDF data={reportData} />);

    // 11. Upload to Supabase Storage
    const filePath = `${student.school_id}/${studentId}/${termId}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("report-cards")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    // 12. Save record in report_cards
    const { data: reportCard, error: insertErr } = await supabaseAdmin
      .from("report_cards")
      .insert({
        student_id: studentId,
        term_id: termId,
        school_id: student.school_id,
        pdf_url: filePath,
        generated_at: now.toISOString(),
        general_average: Math.round(generalAverage * 100) / 100,
        class_rank: classRank ?? null,
        total_students: totalStudents ?? null,
        status: "published",
      })
      .select("id")
      .single();

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    // 13. Return download URL
    return NextResponse.json({
      success: true,
      id: reportCard.id,
      message: "Bulletin généré avec succès",
      url: `/api/reports/download/${reportCard.id}`,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du bulletin" },
      { status: 500 },
    );
  }
}
