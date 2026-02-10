import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Schémas de validation pour les outils
const calculateAverageSchema = z.object({
  student_id: z.string().uuid(),
  term_id: z.string().uuid(),
  school_id: z.string().optional(), // Facultatif pour la flexibilité, mais recommandé
});

const getStudentInfoSchema = z.object({
  student_id: z.string().uuid(),
  school_id: z.string().optional(),
});

const sendNotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["info", "warning", "success", "error"]),
  school_id: z.string().optional(),
});

// Outils disponibles
const tools = [
  {
    name: "calculate_student_average",
    description: "Calcule la moyenne générale d'un élève pour un trimestre donné.",
    inputSchema: {
      type: "object" as const,
      properties: {
        student_id: { type: "string", description: "UUID de l'élève" },
        term_id: { type: "string", description: "UUID du trimestre" },
        school_id: { type: "string", description: "ID de l'école pour vérification" },
      },
      required: ["student_id", "term_id"],
    },
  },
  {
    name: "get_student_info",
    description: "Récupère les informations complètes d'un élève (nom, classe, contact parents).",
    inputSchema: {
      type: "object" as const,
      properties: {
        student_id: { type: "string", description: "UUID de l'élève" },
        school_id: { type: "string", description: "ID de l'école pour vérification" },
      },
      required: ["student_id"],
    },
  },
  {
    name: "send_notification",
    description: "Envoie une notification officielle à un parent ou un enseignant.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string", description: "UUID du destinataire" },
        title: { type: "string", description: "Titre du message" },
        message: { type: "string", description: "Contenu du message" },
        type: { type: "string", enum: ["info", "warning", "success", "error"] },
        school_id: { type: "string", description: "ID de l'école expéditrice" },
      },
      required: ["user_id", "title", "message", "type"],
    },
  },
];

interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export async function handleCalculateAverage(args: unknown): Promise<ToolResponse> {
  try {
    const { student_id, term_id, school_id } = calculateAverageSchema.parse(args);
    const supabase = createAdminClient();

    let query = supabase
      .from('grades')
      .select('score')
      .eq('student_id', student_id)
      .eq('term_id', term_id);

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data: grades, error } = await query;

    if (error) throw error;
    if (!grades || grades.length === 0) return { content: [{ type: "text", text: "Aucune note trouvée pour ce trimestre." }] };

    const average = grades.reduce((acc, g) => acc + (g.score || 0), 0) / grades.length;
    return {
      content: [{ type: "text", text: `La moyenne calculée est de ${average.toFixed(2)}/20.` }]
    };
  } catch (error) {
    return { content: [{ type: "text", text: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}` }], isError: true };
  }
}

export async function handleGetStudentInfo(args: unknown): Promise<ToolResponse> {
  try {
    const { student_id, school_id } = getStudentInfoSchema.parse(args);
    const supabase = createAdminClient();

    let query = supabase
      .from('students')
      .select('*, classes(name)')
      .eq('id', student_id);

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data: student, error } = await query.single();

    if (error) throw error;
    return {
      content: [{ type: "text", text: `Élève: ${student.first_name} ${student.last_name}, Classe: ${student.classes?.name || 'N/A'}. Statut: ${student.status}` }]
    };
  } catch (error) {
    return { content: [{ type: "text", text: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}` }], isError: true };
  }
}

export async function handleSendNotification(args: unknown): Promise<ToolResponse> {
  try {
    const validated = sendNotificationSchema.parse(args);
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: validated.user_id,
        title: validated.title,
        message: validated.message,
        type: validated.type,
        school_id: validated.school_id,
        read: false
      }]);

    if (error) throw error;
    return {
      content: [{ type: "text", text: "Notification envoyée avec succès." }]
    };
  } catch (error) {
    return { content: [{ type: "text", text: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}` }], isError: true };
  }
}

export { tools };
