import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function chatbotResponse(
  question: string,
  context?: {
    studentName?: string;
    studentAverage?: number;
    studentClasses?: string[];
  }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const contextStr = context
      ? `Contexte: Vous êtes le parent de ${context.studentName || "votre enfant"}.
${context.studentAverage ? `Moyenne actuelle: ${context.studentAverage}/20` : ""}
${context.studentClasses ? `Classes: ${context.studentClasses.join(", ")}` : ""}`
      : "";

    const prompt = `Tu es un assistant IA bienveillant pour les parents d'élèves au Congo-Brazzaville.
Réponds en français en étant utile et constructif.

${contextStr}

Question: ${question}

Réponds de manière concise (2-3 phrases max) et pratique.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return text;
  } catch (error) {
    console.error("Error in chatbot:", error);
    throw error;
  }
}

export async function translateToLingala(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Traduis ce texte du français au Lingala (Congo-Brazzaville):

"${text}"

Réponds uniquement avec la traduction.`;

    const result = await model.generateContent(prompt);
    const translation = result.response.text();

    return translation;
  } catch (error) {
    console.error("Error translating:", error);
    throw error;
  }
}

export async function generateNotificationMessage(type: string, data: any): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompts: { [key: string]: string } = {
      low_grade: `Génère un message court et encourage pour un parent dont l'enfant a une mauvaise note (${data.grade}/20 en ${data.subject}). 
Moins de 50 mots. Français.`,
      high_absence: `Génère un rappel poli pour un parent sur les absences de son enfant (${data.absences} absences). 
Moins de 50 mots. Français.`,
      payment_due: `Génère un rappel amical sur un paiement dû (${data.amount} francs).
Moins de 50 mots. Français.`,
    };

    const prompt = prompts[type] || "Génère un message utile pour les parents.";

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating message:", error);
    throw error;
  }
}
