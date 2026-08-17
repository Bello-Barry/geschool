import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { z } from "zod";

const batchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Aucun bulletin sélectionné"),
});

export async function PATCH(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (auth.role !== "admin_school" && auth.role !== "super_admin")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await request.json();
    const validated = batchSchema.parse(body);

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("report_cards")
      .update({ status: "published" })
      .eq("school_id", auth.schoolId)
      .in("id", validated.ids)
      .select("id");

    if (error) throw error;
    return NextResponse.json({ success: true, updated: data?.length ?? 0 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("reports batch publish error:", error);
    return NextResponse.json({ error: "Impossible de publier les bulletins" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (auth.role !== "admin_school" && auth.role !== "super_admin")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await request.json();
    const validated = batchSchema.parse(body);

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("report_cards")
      .delete()
      .eq("school_id", auth.schoolId)
      .in("id", validated.ids)
      .select("id");

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("reports batch delete error:", error);
    return NextResponse.json({ error: "Impossible de supprimer les bulletins" }, { status: 500 });
  }
}