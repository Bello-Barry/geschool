import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", session.user.id)
    .single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

  const { data: links, error } = await supabase
    .from("student_parents")
    .select(`
      student_id,
      student:student_id(
        id,
        matricule,
        user:user_id(first_name, last_name),
        class:class_id(id, name)
      )
    `)
    .eq("parent_id", parent.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const children = links?.map(l => l.student).filter(Boolean) || [];
  return NextResponse.json({ data: children });
}