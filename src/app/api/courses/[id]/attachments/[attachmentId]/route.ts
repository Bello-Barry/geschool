import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: courseId, attachmentId } = await params;
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

  const { data: attachment } = await adminClient
    .from("course_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("course_id", courseId)
    .single();
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  await adminClient.storage.from("course-attachments").remove([attachment.storage_path]);
  await adminClient.from("course_attachments").delete().eq("id", attachmentId);

  return NextResponse.json({ success: true });
}
