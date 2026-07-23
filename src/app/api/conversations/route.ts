import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id, title, created_at, updated_at,
      participants:conversation_participants(
        user:user_id(id, first_name, last_name, role, email)
      ),
      last_message:messages(id, content, sender_id, created_at)
    `)
    .eq("school_id", auth.schoolId)
    .in("id", (
      await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", auth.userId)
    ).data?.map((r: any) => r.conversation_id) || [])
    .order("updated_at", { ascending: false });

  return NextResponse.json(conversations || []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();
  const { participant_ids } = body;

  if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
    return NextResponse.json({ error: "Au moins un participant requis" }, { status: 400 });
  }

  const allIds = [...new Set([auth.userId, ...participant_ids])];

  const { data: users } = await supabase
    .from("users")
    .select("first_name, last_name")
    .in("id", allIds)
    .eq("school_id", auth.schoolId);

  const title = users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null;

  const { data: conversation, error: convErr } = await supabase
    .from("conversations")
    .insert({ school_id: auth.schoolId, title, created_by: auth.userId })
    .select()
    .single();

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  const participants = allIds.map((user_id: string) => ({
    conversation_id: conversation!.id,
    user_id,
  }));

  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(participants);

  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });

  return NextResponse.json(conversation, { status: 201 });
}
