/**
 * Calcule la moyenne d'une matière selon le système congolais :
 * (Moyenne Devoirs + Moyenne Interros + (Note Compo * 2)) / 4
 */
export function calculateSubjectAverage(
    homeworkScores: number[],
    testScores: number[],
    examScore: number | null
): number {
    const homeworkAvg = homeworkScores.length > 0
        ? homeworkScores.reduce((a, b) => a + b, 0) / homeworkScores.length
        : 0;

    const testAvg = testScores.length > 0
        ? testScores.reduce((a, b) => a + b, 0) / testScores.length
        : 0;

    const effectiveExamScore = examScore ?? 0;

    const average = (homeworkAvg + testAvg + (effectiveExamScore * 2)) / 4;

    return Math.round(average * 100) / 100;
}

/**
 * Calcule la moyenne générale pondérée
 */
export function calculateGeneralAverage(
    subjectAverages: Array<{ average: number; coefficient: number }>
): number {
    let totalWeightedScore = 0;
    let totalCoefficients = 0;

    subjectAverages.forEach((s) => {
        totalWeightedScore += s.average * s.coefficient;
        totalCoefficients += s.coefficient;
    });

    if (totalCoefficients === 0) return 0;

    const average = totalWeightedScore / totalCoefficients;
    return Math.round(average * 100) / 100;
}

/**
 * Détermine si un élève est "à risque" (moyenne < 10)
 */
export function isAtRisk(average: number): boolean {
    return average < 10;
}

/**
 * Traduit une moyenne en appréciation
 */
export function getAppreciation(average: number): string {
    if (average >= 16) return "Très Bien";
    if (average >= 14) return "Bien";
    if (average >= 12) return "Assez Bien";
    if (average >= 10) return "Passable";
    if (average >= 8) return "Insuffisant";
    return "Médiocre";
}
