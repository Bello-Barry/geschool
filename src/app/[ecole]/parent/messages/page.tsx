import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { InboxLayout } from "@/components/messages/inbox-layout";

export const dynamic = "force-dynamic";

export default async function ParentMessagesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabase = createAdminClient();

  const { data: allUsers } = await supabase
    .from("users")
    .select("id, first_name, last_name, role")
    .eq("school_id", auth.schoolId)
    .in("role", ["admin_school", "teacher"])
    .order("first_name");

  const filtered = (allUsers || []).filter((u) => u.id !== auth.userId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Messagerie</h1>
      <InboxLayout userId={auth.userId} role={auth.role} availableUsers={filtered} />
    </div>
  );
}
