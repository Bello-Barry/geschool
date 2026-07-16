import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentsTable } from "@/components/ui/tables";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des élèves</h1>
          <p className="text-gray-600 mt-1">Gérez les élèves de votre école</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${slug}/admin/students/import`}>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Link href={`/${slug}/admin/students/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel élève
            </Button>
          </Link>
        </div>
      </div>

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
