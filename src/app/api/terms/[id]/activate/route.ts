import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: term, error: fetchError } = await supabase
    .from("terms")
    .select("id, school_id")
    .eq("id", id)
    .single();

  if (fetchError || !term) {
    return NextResponse.json({ error: "Trimestre introuvable" }, { status: 404 });
  }
  if (term.school_id !== user.school_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deactivate all other terms for this school, then activate this one.
  // The DB trigger ensures only one is_current per school+academic_year,
  // but we also deactivate across all academic years for safety.
  const { error: deactivateError } = await supabase
    .from("terms")
    .update({ is_current: false })
    .eq("school_id", user.school_id)
    .eq("is_current", true);

  if (deactivateError) {
    console.error("Failed to deactivate other terms", deactivateError);
  }

  const { data, error } = await supabase
    .from("terms")
    .update({ is_current: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to activate term", error);
    return NextResponse.json({ error: "Failed to activate term" }, { status: 500 });
  }

  return NextResponse.json(data);
}
