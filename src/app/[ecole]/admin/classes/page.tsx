import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ClassesGrid } from "@/components/ui/tables";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ClassesPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select(`
      id,
      name,
      level,
      capacity,
      room_number,
      students(count)
    `)
    .eq("school_id", schoolId)
    .order("level, name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des classes"
        description="Organisez vos classes et sections"
        actions={
          <Link href={`/${slug}/admin/classes/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle classe
            </Button>
          </Link>
        }
      />

      <ClassesGrid data={classes || []} slug={slug} />
    </div>
  );
}
