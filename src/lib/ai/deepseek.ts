/**
 * Client pour l'API DeepSeek
 * Utilisé pour l'analyse académique et la génération de commentaires
 */

export interface StudentAcademicData {
    name: string;
    average: number;
    subjectAverages: Array<{ subject: string; average: number; coefficient: number }>;
    attendance: { present: number; absent: number; late: number };
    previousAverage?: number;
}

export async function generateBulletinComment(data: StudentAcademicData): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.warn("DeepSeek API key missing, using fallback comment");
        return `Bon travail. Continuez vos efforts pour le prochain trimestre.`;
    }

    // Simulation d'appel API pour l'instant (à remplacer par un vrai fetch)
    // En production, on utiliserait un stream ou une attente de réponse
    try {
        const prompt = `
      Tu es un directeur d'école expérimenté au Congo-Brazzaville.
      Génère un commentaire constructif et encourageant pour le bulletin de l'élève ${data.name}.
      Moyenne : ${data.average}/20.
      Assiduité : ${data.attendance.present} jours présent, ${data.attendance.absent} absent.
      Mentionne ses points forts et axes d'amélioration basés sur les matières.
      Ton : Formel et bienveillant.
      Langue : Français.
    `;

        // const response = await fetch('https://api.deepseek.com/v1/chat/completions', { ... });
        // return response.choices[0].message.content;

        return `Excellent travail d'ensemble avec une moyenne de ${data.average}. Votre assiduité est exemplaire. Continuez à vous investir particulièrement en mathématiques pour consolider vos acquis.`;
    } catch (error) {
        console.error("DeepSeek API error:", error);
        return "Bon trimestre. Travail satisfaisant.";
    }
}

/**
 * Analyse les performances d'une classe pour détecter les élèves à risque
 */
export async function detectAtRiskStudents(students: Array<StudentAcademicData>): Promise<string[]> {
    // Logique simple pour l'instant : moyenne < 10
    return students
        .filter(s => s.average < 10)
        .map(s => s.name);
}
