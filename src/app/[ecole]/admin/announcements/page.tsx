import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AnnouncementsTableClient } from "@/components/announcements/announcements-table-client";

function audienceLabel(audience: string): string {
  const map: Record<string, string> = {
    all: "Tout le monde",
    teachers: "Enseignants",
    parents: "Parents",
    students: "Élèves",
  };
  return map[audience] || audience;
}

export default async function AnnouncementsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: announcements } = await supabaseAdmin
    .from("announcements")
    .select(`
      id,
      title,
      content,
      audience,
      status,
      created_at,
      creator:created_by(id, email)
    `)
    .eq("school_id", auth.schoolId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Annonces</h1>
          <p className="text-muted-foreground">Publiez des informations à destination de l&apos;établissement.</p>
        </div>
        <Button asChild>
          <Link href={`/${slug}/admin/announcements/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle annonce
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des annonces</CardTitle>
          <CardDescription>Toutes les annonces de votre établissement.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementsTableClient
            slug={slug}
            announcements={announcements || []}
            audienceLabel={audienceLabel}
          />
        </CardContent>
      </Card>
    </div>
  );
}