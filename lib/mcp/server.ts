import {
  Server,
  Tool,
  TextContent,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ToolInputBlockParam,
} from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@/lib/supabase/server";
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

const server = new Server({
  name: "geschool-mcp",
  version: "1.0.0",
});

// Outils disponibles
const tools: Tool[] = [
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

// Handler pour lister les outils
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Handler pour appeler les outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request;

  try {
    switch (name) {
      case "calculate_student_average": {
        const validated = calculateAverageSchema.parse(args);
        const supabase = await createClient();

        // Appeler la fonction PostgreSQL
        const { data, error } = await supabase.rpc("calculate_general_average", {
          p_student_id: validated.student_id,
          p_term_id: validated.term_id,
        });

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: `Moyenne générale: ${data}/20`,
            } as TextContent,
          ],
        };
      }

      case "get_student_info": {
        const validated = getStudentInfoSchema.parse(args);
        const supabase = await createClient();

        const { data: student, error } = await supabase
          .from("students")
          .select(
            `
            *,
            user:user_id(*),
            class:class_id(*)
          `
          )
          .eq("id", validated.student_id)
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(student, null, 2),
            } as TextContent,
          ],
        };
      }

      case "check_promotion_status": {
        const validated = checkPromotionSchema.parse(args);
        const supabase = await createClient();

        // Récupérer la moyenne générale
        const { data: average } = await supabase.rpc("calculate_general_average", {
          p_student_id: validated.student_id,
          p_term_id: validated.current_term_id,
        });

        const isPromoted = (average || 0) >= 10;

        return {
          content: [
            {
              type: "text",
              text: isPromoted
                ? `Élève promu (moyenne: ${average}/20)`
                : `Élève en difficulté (moyenne: ${average}/20)`,
            } as TextContent,
          ],
        };
      }

      case "send_notification": {
        const validated = sendNotificationSchema.parse(args);
        const supabase = await createClient();

        // Récupérer l'école de l'utilisateur
        const { data: user } = await supabase.from("users").select("school_id").eq("id", validated.user_id).single();

        if (!user) throw new Error("User not found");

        const { error } = await supabase.from("notifications").insert({
          user_id: validated.user_id,
          school_id: user.school_id,
          title: validated.title,
          message: validated.message,
          type: validated.type,
        });

        if (error) throw error;

        return {
          content: [
            {
              type: "text",
              text: "Notification envoyée avec succès",
            } as TextContent,
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Erreur: ${errorMessage}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
});

// Démarrer le serveur
const transport = new StdioServerTransport();
await server.connect(transport);
