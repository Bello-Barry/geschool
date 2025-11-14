// DeepSeek API Client - HTTP-based implementation

export async function callDeepSeek(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Réponse indisponible";
  } catch (error) {
    console.error("Error calling DeepSeek:", error);
    throw error;
  }
}

interface StudentData {
  name: string;
  average: number;
  subjectAverages: Array<{ subject: string; average: number; coefficient: number }>;
  attendance: { present: number; absent: number; late: number };
  previousAverage?: number;
}

export async function generateBulletinComment(studentData: StudentData): Promise<string> {
  try {
    const systemPrompt = `Tu es un directeur d'école expérimenté au Congo-Brazzaville. 
Génère un commentaire de bulletin scolaire constructif et encourageant (50-100 mots).
Mentionne les points forts et les axes d'amélioration.
Ton formel et bienveillant.
En français.`;

    const prompt = `Génère un commentaire pour ${studentData.name}:
- Moyenne générale: ${studentData.average}/20
- Meilleures matières: ${studentData.subjectAverages
      .sort((a, b) => b.average - a.average)
      .slice(0, 2)
      .map((s) => `${s.subject} (${s.average})`)
      .join(", ")}
- Présences: ${studentData.attendance.present} jours, ${studentData.attendance.absent} absences
${studentData.previousAverage ? `- Évolution: ${studentData.previousAverage} → ${studentData.average}` : ""}`;

    return await callDeepSeek(prompt, systemPrompt);
  } catch (error) {
    console.error("Error generating comment:", error);
    return "Commentaire indisponible";
  }
}

export async function analyzeSchoolPerformance(grades: Array<{
  average: number;
  classSize: number;
}>): Promise<string> {
  try {
    const avgPerformance =
      grades.reduce((sum, g) => sum + g.average, 0) / grades.length;

    const systemPrompt = `Tu es un expert en analyse académique. 
Fournis une analyse brève (100-150 mots) de la performance scolaire.
Identifie les tendances et les recommandations.
En français.`;

    const prompt = `Analyse la performance: moyenne générale ${avgPerformance.toFixed(2)}/20, 
${grades.length} classes suivies. Recommande des actions d'amélioration.`;

    return await callDeepSeek(prompt, systemPrompt);
  } catch (error) {
    console.error("Error analyzing performance:", error);
    return "Analyse indisponible";
  }
}

export async function detectAtRiskStudents(students: Array<{
  name: string;
  average: number;
  absent_days: number;
}>): Promise<Array<{ name: string; reason: string; recommendation: string }>> {
  const atRisk = students.filter((s) => s.average < 10 || s.absent_days > 10);

  if (atRisk.length === 0) {
    return [];
  }

  const recommendations: Array<{
    name: string;
    reason: string;
    recommendation: string;
  }> = [];

  for (const student of atRisk) {
    try {
      const systemPrompt = `Tu es un conseiller pédagogique. 
Fournis une recommandation brève (1-2 phrases) pour aider cet élève en difficulté.
En français.`;

      const prompt = `${student.name}: moyenne ${student.average}/20, ${student.absent_days} absences. 
Quelle recommandation pédagogique?`;

      const recommendation = await callDeepSeek(prompt, systemPrompt);

      recommendations.push({
        name: student.name,
        reason:
          student.average < 10
            ? `Moyenne faible (${student.average}/20)`
            : `Absences nombreuses (${student.absent_days} jours)`,
        recommendation,
      });
    } catch (error) {
      console.error(`Error for student ${student.name}:`, error);
      recommendations.push({
        name: student.name,
        reason: "Erreur d'analyse",
        recommendation: "Suivi pédagogique recommandé",
      });
    }
  }

  return recommendations;
}
