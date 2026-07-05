import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

export default async function StudentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect("/login");

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
        email
      ),
      class:class_id(
        name
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Matricule</th>
                  <th className="text-left py-3 px-4 font-semibold">Nom</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Classe</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students && students.length > 0 ? (
                  students.map((student: any) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{student.matricule}</td>
                      <td className="py-3 px-4">
                        {student.user?.first_name} {student.user?.last_name}
                      </td>
                      <td className="py-3 px-4">{student.user?.email}</td>
                      <td className="py-3 px-4">{student.class?.name || "-"}</td>
                      <td className="py-3 px-4">
                        <Link href={`/${slug}/admin/students/${student.id}`}>
                          <Button variant="outline" size="sm">
                            Voir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      Aucun élève inscrit pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
