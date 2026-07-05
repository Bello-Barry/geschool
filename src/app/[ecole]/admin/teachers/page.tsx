import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        email
      ),
      teacher_subjects(
        subject:subject_id(name),
        class:class_id(name)
      )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des enseignants</h1>
          <p className="text-gray-600 mt-1">Gérez votre équipe pédagogique</p>
        </div>
        <Link href={`/${slug}/admin/teachers/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel enseignant
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enseignants ({teachers?.length || 0})</CardTitle>
          <CardDescription>Tous les enseignants actifs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers && teachers.length > 0 ? (
              teachers.map((teacher: any) => (
                <Card key={teacher.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {teacher.user?.first_name} {teacher.user?.last_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {teacher.specialization || "Général"}
                        </CardDescription>
                      </div>
                      <Link href={`/${slug}/admin/teachers/${teacher.id}`}>
                        <Button variant="ghost" size="sm">
                          Éditer
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Email:</strong> {teacher.user?.email}</p>
                    <p><strong>ID Employé:</strong> {teacher.employee_id || "-"}</p>
                    {teacher.teacher_subjects && teacher.teacher_subjects.length > 0 && (
                      <div>
                        <strong>Classes:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {teacher.teacher_subjects.map((ts: any, i: number) => (
                            <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                              {ts.class?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-gray-500">
                Aucun enseignant inscrit pour le moment
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
