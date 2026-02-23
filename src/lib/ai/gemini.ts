import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Client pour l'API Gemini
 * Utilisé pour le chatbot parents (Français/Lingala)
 */

export async function getChatbotResponse(
    message: string,
    context: { studentName?: string; schoolName: string; language: 'fr' | 'ln' }
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return "Je suis désolé, le service d'assistance n'est pas configuré. Veuillez contacter l'école directement.";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemInstruction = `
    Tu es l'assistant IA de l'école ${context.schoolName} au Congo-Brazzaville.
    Ton rôle est d'aider les parents avec des informations sur la scolarité de leur enfant.
    ${context.studentName ? `L'élève concerné est ${context.studentName}.` : ""}
    Langue demandée : ${context.language === 'ln' ? 'Lingala' : 'Français'}.
    Sois poli, concis et utile. Si tu ne connais pas la réponse, redirige vers le secrétariat.
  `;

    try {
        const result = await model.generateContent([systemInstruction, message]);
        return result.response.text();
    } catch (error) {
        console.error("Gemini API error:", error);
        return "Une erreur est survenue lors de la communication avec l'assistant. Merci de réessayer plus tard.";
    }
}

/**
 * Traduit un message court en Lingala
 */
export async function translateToLingala(text: string): Promise<string> {
    // Pour le MVP on pourrait utiliser Gemini pour traduire
    return await getChatbotResponse(`Traduis ce message en Lingala : "${text}"`, { schoolName: "Système", language: 'ln' });
}
