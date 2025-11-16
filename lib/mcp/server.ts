import { z } from "zod";

// Schémas de validation pour les outils
const calculateAverageSchema = z.object({
  student_id: z.string().uuid(),
  term_id: z.string().uuid(),
});

const getStudentInfoSchema = z.object({
  student_id: z.string().uuid(),
});

const checkPromotionSchema = z.object({
  student_id: z.string().uuid(),
  current_term_id: z.string().uuid(),
});

const sendNotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["info", "warning", "success", "error"]),
});

// Outils disponibles
const tools: Array<{
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}> = [
  {
    name: "calculate_student_average",
    description: "Calcule la moyenne générale d'un élève pour un trimestre",
    inputSchema: {
      type: "object" as const,
      properties: {
        student_id: {
          type: "string",
          description: "UUID de l'élève",
        },
        term_id: {
          type: "string",
          description: "UUID du trimestre",
        },
      },
      required: ["student_id", "term_id"],
    },
  },
  {
    name: "get_student_info",
    description: "Récupère les informations complètes d'un élève",
    inputSchema: {
      type: "object" as const,
      properties: {
        student_id: {
          type: "string",
          description: "UUID de l'élève",
        },
      },
      required: ["student_id"],
    },
  },
  {
    name: "check_promotion_status",
    description: "Vérifie si un élève est promu au trimestre suivant",
    inputSchema: {
      type: "object" as const,
      properties: {
        student_id: {
          type: "string",
          description: "UUID de l'élève",
        },
        current_term_id: {
          type: "string",
          description: "UUID du trimestre actuel",
        },
      },
      required: ["student_id", "current_term_id"],
    },
  },
  {
    name: "send_notification",
    description: "Envoie une notification à un utilisateur",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "UUID de l'utilisateur",
        },
        title: {
          type: "string",
          description: "Titre de la notification",
        },
        message: {
          type: "string",
          description: "Contenu de la notification",
        },
        type: {
          type: "string",
          enum: ["info", "warning", "success", "error"],
          description: "Type de notification",
        },
      },
      required: ["user_id", "title", "message", "type"],
    },
  },
];

// Tipos para handlers
interface ToolResponse {
  content: Array<{
    type: "text" | "resource";
    text?: string;
    isError?: boolean;
  }>;
  isError?: boolean;
}

// Handlers para herramientas
export async function handleCalculateAverage(args: unknown): Promise<ToolResponse> {
  try {
    const validated = calculateAverageSchema.parse(args);
    // Aquí iría la lógica de Supabase
    return {
      content: [
        {
          type: "text",
          text: `Promedio general: ${validated.student_id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetStudentInfo(args: unknown): Promise<ToolResponse> {
  try {
    const validated = getStudentInfoSchema.parse(args);
    return {
      content: [
        {
          type: "text",
          text: `Student info for: ${validated.student_id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleCheckPromotion(args: unknown): Promise<ToolResponse> {
  try {
    const validated = checkPromotionSchema.parse(args);
    return {
      content: [
        {
          type: "text",
          text: `Promotion check for: ${validated.student_id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleSendNotification(args: unknown): Promise<ToolResponse> {
  try {
    const validated = sendNotificationSchema.parse(args);
    return {
      content: [
        {
          type: "text",
          text: `Notification sent to: ${validated.user_id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

// Exportar tools y schemas para uso en otras partes de la app
export { tools, calculateAverageSchema, getStudentInfoSchema, checkPromotionSchema, sendNotificationSchema };
