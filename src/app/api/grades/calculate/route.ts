import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateSubjectAverage } from "@/lib/utils/calculations";
import { z } from "zod";

const calculateSchema = z.object({
    studentId: z.string().uuid(),
    subjectId: z.string().uuid(),
    termId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const body = await request.json();
        const validation = calculateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { studentId, subjectId, termId } = validation.data;

        // Récupérer toutes les notes de l'élève pour cette matière et ce trimestre
        const { data: grades, error } = await supabase
            .from("grades")
            .select("score, grade_type")
            .eq("student_id", studentId)
            .eq("subject_id", subjectId)
            .eq("term_id", termId);

        if (error) throw error;

        const homeworkScores = grades.filter(g => g.grade_type === 'homework').map(g => Number(g.score));
        const testScores = grades.filter(g => g.grade_type === 'test').map(g => Number(g.score));
        const examGrade = grades.find(g => g.grade_type === 'exam');
        const examScore = examGrade ? Number(examGrade.score) : null;

        const average = calculateSubjectAverage(homeworkScores, testScores, examScore);

        return NextResponse.json({ average });

    } catch (error) {
        console.error("Calculation error:", error);
        return NextResponse.json({ error: "Erreur lors du calcul" }, { status: 500 });
    }
}
