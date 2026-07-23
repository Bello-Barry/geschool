import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const messageId = formData.get("messageId") as string | null;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file || !messageId || !conversationId) {
    return NextResponse.json({ error: "Fichier, messageId et conversationId requis" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Type de fichier non autorisé (PDF, Word, images uniquement)" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("conversation_participants")
    .select("id", { count: "exact" })
    .eq("conversation_id", conversationId)
    .eq("user_id", auth.userId);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Vous n'êtes pas participant de cette conversation" }, { status: 403 });
  }

  const { data: msg } = await supabase
    .from("messages")
    .select("id")
    .eq("id", messageId)
    .eq("sender_id", auth.userId)
    .single();

  if (!msg) {
    return NextResponse.json({ error: "Message introuvable ou vous n'en êtes pas l'auteur" }, { status: 403 });
  }

  const fileExt = file.name.split(".").pop();
  const storagePath = `${conversationId}/${messageId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("message-attachments")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Erreur d'upload: " + uploadError.message }, { status: 500 });
  }

  const { data: attachment, error: dbError } = await supabase
    .from("message_attachments")
    .insert({
      message_id: messageId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from("message-attachments").remove([storagePath]);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }

  return NextResponse.json(attachment, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return NextResponse.json({ error: "messageId requis" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: msg } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("id", messageId)
    .single();

  if (!msg) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });

  const { count } = await supabase
    .from("conversation_participants")
    .select("id", { count: "exact" })
    .eq("conversation_id", msg.conversation_id)
    .eq("user_id", auth.userId);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: attachments } = await supabase
    .from("message_attachments")
    .select("*")
    .eq("message_id", messageId)
    .order("created_at");

  const withUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data: signedUrl } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(att.storage_path, 3600);
      return { ...att, signed_url: signedUrl?.signedUrl || null };
    })
  );

  return NextResponse.json(withUrls);
}
