import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Pencil, Mail, Phone, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteParentButton } from "@/components/forms/delete-parent-button";
import { ToggleActiveButton } from "@/components/forms/toggle-active-button";

export default async function ParentDetailPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select(`
      id,
      user_id,
      relationship,
      profession,
      user:user_id(
        first_name,
        last_name,
        email,
        phone,
        is_active
      ),
      student_parents(
        id,
        student:student_id(
          id,
          matricule,
          user:user_id(first_name, last_name),
          class:class_id(name)
        )
      )
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) notFound();

  const userData = parent.user as unknown as { first_name: string; last_name: string; email: string; phone: string; is_active: boolean } | null;
  const children = parent.student_parents as unknown as Array<{
    id: string;
    student: { id: string; matricule: string; user: { first_name: string; last_name: string } | null; class: { name: string } | null } | null;
  }> | null;
  const parentUserId = (parent as any).user_id as string | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/parents`}>
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
              <CardDescription>Détails du parent</CardDescription>
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
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{userData?.phone || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lien de parenté</p>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{parent.relationship || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profession</p>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{parent.profession || "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enfants liés</CardTitle>
              <CardDescription>Élèves associés à ce parent</CardDescription>
            </CardHeader>
            <CardContent>
              {children && children.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Matricule</th>
                        <th className="text-left py-3 px-4 font-semibold">Nom</th>
                        <th className="text-left py-3 px-4 font-semibold">Classe</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((sp) => (
                        <tr key={sp.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{sp.student?.matricule || "-"}</td>
                          <td className="py-3 px-4">
                            {sp.student?.user
                              ? `${sp.student.user.first_name} ${sp.student.user.last_name}`
                              : "-"}
                          </td>
                          <td className="py-3 px-4">{sp.student?.class?.name || "-"}</td>
                          <td className="py-3 px-4">
                            {sp.student && (
                              <Link href={`/${ecole}/admin/students/${sp.student.id}`}>
                                <Button variant="outline" size="sm">
                                  Voir
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">Aucun enfant lié à ce parent</p>
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
                <Link href={`/${ecole}/admin/parents/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <DeleteParentButton id={id} slug={ecole} />
              {parentUserId && (
                <ToggleActiveButton userId={parentUserId} isActive={userData?.is_active ?? true} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
