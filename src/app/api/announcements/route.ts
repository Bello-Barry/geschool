import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  content: z.string().min(1, "Contenu requis"),
  audience: z.enum(["all", "teachers", "parents", "students"]).default("all"),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("announcements")
    .select("*, creator:created_by(id, email)")
    .eq("school_id", user.school_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const validated = createSchema.parse(body);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("announcements")
      .insert({
        school_id: user.school_id,
        title: validated.title,
        content: validated.content,
        audience: validated.audience,
        status: validated.status,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    console.error("announcements POST error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}