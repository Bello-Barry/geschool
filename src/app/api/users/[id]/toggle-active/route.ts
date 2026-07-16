import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAdmin = createAdminClient();

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("is_active")
    .eq("id", id)
    .single();

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_active: !user.is_active })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
