import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeachersGrid } from "@/components/ui/tables";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TeachersPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: teachers } = await supabaseAdmin
    .from("teachers")
    .select(`
      id,
      employee_id,
      specialization,
      user:user_id(
        first_name,
        last_name,
        email,
        is_active
      ),
      teacher_subjects(
        subject:subject_id(name),
        class:class_id(name)
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const teachersWithMeta = (teachers ?? []).map((t: any) => ({
    ...t,
    is_active: t.user?.is_active ?? true,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des enseignants"
        description="Gérez votre équipe pédagogique"
        actions={
          <Link href={`/${slug}/admin/teachers/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel enseignant
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Enseignants ({teachers?.length || 0})</CardTitle>
          <CardDescription>Tous les enseignants</CardDescription>
        </CardHeader>
        <CardContent>
          <TeachersGrid data={teachersWithMeta} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
