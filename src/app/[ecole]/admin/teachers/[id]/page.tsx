import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Pencil, Mail, BookOpen, Hash, Calendar } from "lucide-react";
import { DeleteTeacherButton } from "@/components/forms/delete-teacher-button";
import { ToggleActiveButton } from "@/components/forms/toggle-active-button";

export default async function TeacherDetailPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: teacher } = await supabaseAdmin
    .from("teachers")
    .select(`
      id,
      user_id,
      specialization,
      employee_id,
      hire_date,
      user:user_id(
        first_name,
        last_name,
        email,
        is_active
      ),
      teacher_subjects(
        id,
        subject:subject_id(name),
        class:class_id(name)
      )
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!teacher) notFound();

  const userData = teacher.user as unknown as { first_name: string; last_name: string; email: string; is_active: boolean } | null;
  const subjects = teacher.teacher_subjects as unknown as Array<{ id: string; subject: { name: string } | null; class: { name: string } | null }> | null;
  const teacherUserId = (teacher as any).user_id as string | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/teachers`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {userData?.first_name} {userData?.last_name}
          </h1>
          {userData && (
            <Badge variant={userData.is_active === false ? "secondary" : "outline"}>
              {userData.is_active === false ? "Inactif" : "Actif"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Détails de l'enseignant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Prénom</p>
                  <p className="font-medium">{userData?.first_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nom</p>
                  <p className="font-medium">{userData?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{userData?.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Spécialisation</p>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{teacher.specialization || "Général"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Identifiant employé</p>
                  <div className="flex items-center gap-1">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{teacher.employee_id || "-"}</p>
                  </div>
                </div>
                {teacher.hire_date && (
                  <div>
                    <p className="text-sm text-gray-500">Date d'embauche</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{new Date(teacher.hire_date).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classes et matières assignées</CardTitle>
              <CardDescription>Enseignements de cet enseignant</CardDescription>
            </CardHeader>
            <CardContent>
              {subjects && subjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Matière</th>
                        <th className="text-left py-3 px-4 font-semibold">Classe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((ts) => (
                        <tr key={ts.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <Badge variant="outline">{ts.subject?.name || "-"}</Badge>
                          </td>
                          <td className="py-3 px-4">{ts.class?.name || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">Aucune classe ou matière assignée</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href={`/${ecole}/admin/teachers/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <DeleteTeacherButton id={id} slug={ecole} />
              {teacherUserId && (
                <ToggleActiveButton userId={teacherUserId} isActive={userData?.is_active ?? true} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
