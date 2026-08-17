import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { AnnouncementsFeed } from "@/components/announcements/announcements-feed";

export default async function ParentAnnouncementsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);
  const schoolId = auth.schoolId;

  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content, audience, status, created_at")
    .eq("school_id", schoolId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Annonces</h1>
        <p className="text-sm text-muted-foreground mt-1">Informations de l&apos;établissement</p>
      </div>
      <AnnouncementsFeed announcements={announcements || []} />
    </div>
  );
}