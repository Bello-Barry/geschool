import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth || !["admin_school", "super_admin", "teacher"].includes(auth.role))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("programmes")
    .update({
      subject_id: body.subject_id,
      class_id: body.class_id,
      term_id: body.term_id,
      week_number: body.week_number,
      topic: body.topic,
      learning_objectives: body.learning_objectives ?? null,
      resources: body.resources ?? null,
      evaluation_method: body.evaluation_method ?? null,
      status: body.status,
    })
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser();
  if (!auth || !["admin_school", "super_admin"].includes(auth.role))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("programmes")
    .delete()
    .eq("id", id)
    .eq("school_id", auth.schoolId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
