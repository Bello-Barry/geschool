import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const attendanceSchema = z.object({
  student_id: z.string().uuid(),
  status: z.enum(["present", "absent"]),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("td_attendance")
    .select(`
      *,
      student:student_id(
        id,
        user:user_id(first_name, last_name)
      )
    `)
    .eq("td_session_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = attendanceSchema.parse(body);
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("td_attendance")
      .upsert(
        {
          td_session_id: id,
          student_id: validated.student_id,
          status: validated.status,
          marked_at: new Date().toISOString(),
        },
        { onConflict: "td_session_id, student_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}