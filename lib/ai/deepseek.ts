import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface StudentData {
  name: string;
  average: number;
  subjectAverages: Array<{ subject: string; average: number; coefficient: number }>;
  attendance: { present: number; absent: number; late: number };
  previousAverage?: number;
}

export async function generateBulletinComment(studentData: StudentData): Promise<string> {
  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      system: `Tu es un directeur d'école expérimenté au Congo-Brazzaville. 
Génère un commentaire de bulletin scolaire constructif et encourageant (50-100 mots).
Mentionne les points forts et les axes d'amélioration.
Ton formel et bienveillant.
En français.`,
      messages: [
        {
          role: "user",
          content: `Génère un commentaire pour ${studentData.name}:
- Moyenne générale: ${studentData.average}/20
- Meilleures matières: ${studentData.subjectAverages
            .sort((a, b) => b.average - a.average)
            .slice(0, 2)
            .map((s) => `${s.subject} (${s.average})`)
            .join(", ")}
- Présences: ${studentData.attendance.present} jours, ${studentData.attendance.absent} absences
${studentData.previousAverage ? `- Évolution: ${studentData.previousAverage} → ${studentData.average}` : ""}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text") {
      return content.text;
    }

    return "Commentaire indisponible";
  } catch (error) {
    console.error("Error generating comment:", error);
    throw error;
  }
}

export async function analyzeSchoolPerformance(grades: Array<{
  average: number;
  classSize: number;
}>): Promise<string> {
  try {
    const avgPerformance =
      grades.reduce((sum, g) => sum + g.average, 0) / grades.length;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system: `Tu es un expert en analyse académique. 
Fournis une analyse brève (100-150 mots) de la performance scolaire.
Identifie les tendances et les recommandations.
En français.`,
      messages: [
        {
          role: "user",
          content: `Analyse la performance: moyenne générale ${avgPerformance.toFixed(2)}/20, 
${grades.length} classes suivies. Recommande des actions d'amélioration.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text") {
      return content.text;
    }

    return "Analyse indisponible";
  } catch (error) {
    console.error("Error analyzing performance:", error);
    throw error;
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
      const message = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 150,
        system: `Tu es un conseiller pédagogique. 
Fournis une recommandation brève (1-2 phrases) pour aider cet élève en difficulté.
En français.`,
        messages: [
          {
            role: "user",
            content: `${student.name}: moyenne ${student.average}/20, ${student.absent_days} absences. 
Quelle recommandation pédagogique?`,
          },
        ],
      });

      const content = message.content[0];
      const recommendation =
        content.type === "text" ? content.text : "Suivi pédagogique recommandé";

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
    }
  }

  return recommendations;
}
