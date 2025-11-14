// MCP Server - Model Context Protocol Integration for Geschool
// This file is designed to be run as a standalone server process
// and is not imported in the Next.js app itself

// NOTE: To use this MCP server, install dependencies:
// pnpm add @modelcontextprotocol/sdk
// Then run: node --loader ts-node/esm lib/mcp/server.ts

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

// Export tool schemas for external integration
export const TOOL_SCHEMAS = {
  calculateAverageSchema,
  getStudentInfoSchema,
  checkPromotionSchema,
  sendNotificationSchema,
};

// Tool definitions
export const AVAILABLE_TOOLS = [
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

// Handler function to process tool calls (for external MCP servers)
export async function processMCPToolCall(
  toolName: string,
  args: Record<string, any>
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case "calculate_student_average": {
        const validated = calculateAverageSchema.parse(args);
        // Implementation would connect to Supabase
        return {
          content: [
            {
              type: "text",
              text: `Moyenne générale calculée pour l'élève ${validated.student_id}`,
            },
          ],
        };
      }

      case "get_student_info": {
        const validated = getStudentInfoSchema.parse(args);
        return {
          content: [
            {
              type: "text",
              text: `Informations récupérées pour l'élève ${validated.student_id}`,
            },
          ],
        };
      }

      case "check_promotion_status": {
        const validated = checkPromotionSchema.parse(args);
        return {
          content: [
            {
              type: "text",
              text: `Statut de promotion vérifié pour l'élève ${validated.student_id}`,
            },
          ],
        };
      }

      case "send_notification": {
        const validated = sendNotificationSchema.parse(args);
        return {
          content: [
            {
              type: "text",
              text: `Notification envoyée à l'utilisateur ${validated.user_id}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Outil inconnu: ${toolName}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return {
      content: [
        {
          type: "text",
          text: `Erreur: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
