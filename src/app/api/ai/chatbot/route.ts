import { NextRequest, NextResponse } from "next/server";
import { getChatbotResponse } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const chatSchema = z.object({
    message: z.string().min(1),
    language: z.enum(['fr', 'ln']).default('fr'),
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { data: userProfile } = await supabase
            .from("users")
            .select("school_id")
            .eq("id", session.user.id)
            .single();
        let schoolName = "l'école";
        if (userProfile?.school_id) {
            const { data: school } = await supabase
                .from("schools")
                .select("name")
                .eq("id", userProfile.school_id)
                .single();
            if (school?.name) schoolName = school.name;
        }

        const body = await request.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { message, language } = validation.data;

        const response = await getChatbotResponse(message, {
            schoolName,
            language,
            studentName: "votre enfant",
        });

        return NextResponse.json({ response });

    } catch (error) {
        console.error("Chatbot API error:", error);
        return NextResponse.json({ error: "L'assistant n'est pas disponible" }, { status: 500 });
    }
}
