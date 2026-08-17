import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AnnouncementForm } from "@/components/forms/announcement-form";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();
  const { data: announcement } = await supabaseAdmin
    .from("announcements")
    .select("id, title, content, audience, status")
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!announcement) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/announcements`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier l&apos;annonce</h1>
      </div>
      <div className="max-w-2xl">
        <AnnouncementForm
          initialData={{
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            audience: announcement.audience,
            status: announcement.status,
          }}
        />
      </div>
    </div>
  );
}