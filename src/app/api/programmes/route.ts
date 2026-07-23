import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";

export async function GET(_request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(_request.url);
  const subject_id = searchParams.get("subject_id");
  const class_id = searchParams.get("class_id");
  const term_id = searchParams.get("term_id");

  let query = supabase
    .from("programmes")
    .select(`
      id,
      week_number,
      topic,
      learning_objectives,
      resources,
      evaluation_method,
      status,
      created_at,
      updated_at,
      subject:subject_id(id, name, coefficient),
      class:class_id(id, name),
      term:term_id(id, name),
      teacher:created_by(id, user:user_id(first_name, last_name))
    `)
    .eq("school_id", auth.schoolId)
    .order("week_number");

  if (subject_id) query = query.eq("subject_id", subject_id);
  if (class_id) query = query.eq("class_id", class_id);
  if (term_id) query = query.eq("term_id", term_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || !["admin_school", "super_admin", "teacher"].includes(auth.role))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  const { data, error } = await supabase
    .from("programmes")
    .insert({
      school_id: auth.schoolId,
      subject_id: body.subject_id,
      class_id: body.class_id,
      term_id: body.term_id,
      week_number: body.week_number,
      topic: body.topic,
      learning_objectives: body.learning_objectives || null,
      resources: body.resources || null,
      evaluation_method: body.evaluation_method || null,
      status: body.status || "draft",
      created_by: teacher?.id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
