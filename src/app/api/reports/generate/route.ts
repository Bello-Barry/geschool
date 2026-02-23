import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const reportSchema = z.object({
    studentId: z.string().uuid(),
    termId: z.string().uuid(),
    type: z.enum(['report_card', 'receipt']).default('report_card'),
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const body = await request.json();
        const validation = reportSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const { studentId, termId, type } = validation.data;

        // Ici on appellerait le générateur de PDF (lib/utils/pdf-generator.ts)
        // Pour le MVP, on simule la génération et on renvoie une URL ou un succès

        // 1. Récupérer les données de l'élève
        // 2. Calculer les moyennes (système congolais)
        // 3. Générer le commentaire IA si absent
        // 4. Créer le PDF
        // 5. Uploader dans Supabase Storage
        // 6. Enregistrer dans la table report_cards

        return NextResponse.json({
            success: true,
            message: `${type === 'report_card' ? 'Bulletin' : 'Reçu'} généré avec succès`,
            url: `/api/reports/download/${studentId}/${termId}` // Route fictive pour le téléchargement
        });

    } catch (error) {
        console.error("Report generation error:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du rapport" }, { status: 500 });
    }
}
