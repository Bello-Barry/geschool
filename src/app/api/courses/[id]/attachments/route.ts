import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();
  if (!user || (user.role !== "teacher" && user.role !== "admin_school" && user.role !== "super_admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  const { data: course } = await adminClient
    .from("courses")
    .select("teacher_id, school_id")
    .eq("id", courseId)
    .single();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  if (user.role === "teacher") {
    const { data: teacherRec } = await adminClient
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .single();
    if (!teacherRec || teacherRec.id !== course.teacher_id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });

  const fileExt = file.name.split(".").pop();
  const storagePath = `courses/${courseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await adminClient.storage
    .from("course-attachments")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError)
    return NextResponse.json({ error: "Erreur d'upload: " + uploadError.message }, { status: 500 });

  const { data: attachment, error: dbError } = await adminClient
    .from("course_attachments")
    .insert({
      course_id: courseId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    await adminClient.storage.from("course-attachments").remove([storagePath]);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }

  const { data: signedUrlData } = await adminClient.storage
    .from("course-attachments")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({ ...attachment, signed_url: signedUrlData?.signedUrl }, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();

  const { data: attachments } = await adminClient
    .from("course_attachments")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at");

  const withUrls = await Promise.all(
    (attachments || []).map(async (att) => {
      const { data: signedUrlData } = await adminClient.storage
        .from("course-attachments")
        .createSignedUrl(att.storage_path, 3600);
      return { ...att, signed_url: signedUrlData?.signedUrl || null };
    })
  );

  return NextResponse.json(withUrls);
}
