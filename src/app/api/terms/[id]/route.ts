import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  start_date: z.string().min(1).optional(),
  end_date: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

export async function PATCH(
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

  try {
    const body = await request.json();
    const validated = schema.parse(body);

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

    const { data, error } = await supabase
      .from("terms")
      .update(validated)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update term" }, { status: 500 });
  }
}
