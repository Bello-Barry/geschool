import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";

async function isParticipant(supabase: ReturnType<typeof createAdminClient>, conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();

  if (!(await isParticipant(supabase, id, auth.userId))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Update last_read_at for this participant
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", auth.userId);

  const { data: messages, error } = await supabase
    .from("messages")
    .select(`
      id, content, sender_id, created_at,
      sender:sender_id(first_name, last_name, role, email),
      attachments:message_attachments(id, file_name, file_type, file_size, storage_path, created_at)
    `)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withSignedUrls = await Promise.all(
    (messages || []).map(async (msg: any) => {
      const atts = msg.attachments || [];
      const withUrls = await Promise.all(
        atts.map(async (att: any) => {
          const { data: signed } = await supabase.storage
            .from("message-attachments")
            .createSignedUrl(att.storage_path, 3600);
          return { ...att, signed_url: signed?.signedUrl || null };
        })
      );
      return { ...msg, attachments: withUrls };
    })
  );

  return NextResponse.json(withSignedUrls);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();

  if (!(await isParticipant(supabase, id, auth.userId))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: auth.userId,
      content: body.content.trim(),
    })
    .select(`
      id, content, sender_id, created_at,
      sender:sender_id(first_name, last_name, role, email)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json(message, { status: 201 });
}
