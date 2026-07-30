import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TdSessionsPageClient } from "@/components/td/td-sessions-page-client";

export default async function TeacherTdPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();
  if (!user || user.role !== "teacher") redirect("/");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", user.school_id)
    .order("name");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", user.school_id)
    .order("name");

  return (
    <TdSessionsPageClient
      classes={classes || []}
      subjects={subjects || []}
    />
  );
}