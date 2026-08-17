import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSchoolPerformance } from '@/lib/ai/deepseek';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("school_id")
      .eq("id", session.user.id)
      .single();
    const schoolId = userProfile?.school_id;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID missing' }, { status: 400 });
    }

    // Récupérer les moyennes par classe
    const { data: gradesData, error } = await supabase
      .from('grades')
      .select('score, student_id')
      .eq('school_id', schoolId);

    if (error) throw error;

    const { data: studentsMeta } = await supabase
      .from('students')
      .select('id, class:class_id(name)')
      .eq('school_id', schoolId);

    const classOf: Record<string, string> = {};
    (studentsMeta ?? []).forEach((s: any) => {
      classOf[s.id] = (s.class as any)?.name ?? 'Inconnue';
    });

    // Calculer la moyenne par classe (simplifié pour la démo)
    const classStats: Record<string, { total: number, count: number }> = {};
    gradesData?.forEach(g => {
      const className = classOf[g.student_id] || 'Inconnue';
      if (!classStats[className]) classStats[className] = { total: 0, count: 0 };
      classStats[className].total += g.score || 0;
      classStats[className].count += 1;
    });

    const performanceData = Object.entries(classStats).map(([, stats]) => ({
      average: stats.total / stats.count,
      classSize: stats.count
    }));

    if (performanceData.length === 0) {
       return NextResponse.json({ analysis: "Pas assez de données pour l'analyse." });
    }

    const analysis = await analyzeSchoolPerformance(performanceData);

    // Détection d'élèves à risque
    const { data: atRiskData } = await supabase
      .from('students')
      .select('id, user:user_id(first_name, last_name)')
      .eq('school_id', schoolId);

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('school_id', schoolId);

    const absentByStudent: Record<string, number> = {};
    (attendanceData ?? []).forEach((a: any) => {
      if (a.status === 'absent') absentByStudent[a.student_id] = (absentByStudent[a.student_id] ?? 0) + 1;
    });

    const atRiskCount = (atRiskData ?? []).filter((s: any) => (absentByStudent[s.id] ?? 0) > 5).length;

    return NextResponse.json({
      analysis,
      atRiskCount,
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze performance' }, { status: 500 });
  }
}
