import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentsTable } from "@/components/ui/tables";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function StudentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: students } = await supabaseAdmin
    .from("students")
    .select(`
      id,
      matricule,
      date_of_birth,
      user:user_id(
        first_name,
        last_name,
        email,
        is_active
      ),
      class:class_id(
        name
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  const studentsWithMeta = (students ?? []).map((s: any) => ({
    ...s,
    is_active: s.user?.is_active ?? true,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des élèves"
        description="Gérez les élèves de votre école"
        actions={
          <>
            <Link href={`/${slug}/admin/students/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel élève
              </Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Liste des élèves ({students?.length || 0})</CardTitle>
          <CardDescription>Tous les élèves inscrits dans votre école</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentsTable data={studentsWithMeta} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
