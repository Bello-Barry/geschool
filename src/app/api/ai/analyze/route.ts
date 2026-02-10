import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSchoolPerformance } from '@/lib/ai/deepseek';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const schoolId = headersList.get('x-school-id');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID missing' }, { status: 400 });
    }

    // Récupérer les moyennes par classe
    const { data: gradesData, error } = await supabase
      .from('grades')
      .select('score, student_id, classes(name)')
      .eq('school_id', schoolId);

    if (error) throw error;

    // Calculer la moyenne par classe (simplifié pour la démo)
    const classStats: Record<string, { total: number, count: number }> = {};
    gradesData?.forEach(g => {
      const className = (g.classes as any)?.name || 'Inconnue';
      if (!classStats[className]) classStats[className] = { total: 0, count: 0 };
      classStats[className].total += g.score || 0;
      classStats[className].count += 1;
    });

    const performanceData = Object.entries(classStats).map(([name, stats]) => ({
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
      .select('first_name, last_name, attendance(status)')
      .eq('school_id', schoolId);

    // Simplification pour la démo: on récupère les élèves avec beaucoup d'absences
    const studentStats = atRiskData?.map(s => ({
      name: `${s.first_name} ${s.last_name}`,
      average: 12, // mock car on n'a pas joint les notes ici
      absent_days: (s.attendance as any[])?.filter((a: any) => a.status === 'absent').length || 0
    })) || [];

    return NextResponse.json({
      analysis,
      atRiskCount: studentStats.filter(s => s.absent_days > 5).length
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze performance' }, { status: 500 });
  }
}
