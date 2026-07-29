import { createClient } from "@/lib/supabase/server";
import { getSchoolFromHeaders } from "@/lib/utils/school-resolver";
import { TdSessionsPageClient } from "@/components/td/td-sessions-page-client";

export default async function TeacherTdPage() {
  const supabase = await createClient();
  const school = getSchoolFromHeaders();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return <div>Non connecté</div>;

  const { data: teacherRec } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("school_id", school?.id)
    .single();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", school?.id)
    .order("name");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", school?.id)
    .order("name");

  return (
    <TdSessionsPageClient
      teacherId={teacherRec?.id}
      schoolId={school?.id}
      classes={classes || []}
      subjects={subjects || []}
    />
  );
}