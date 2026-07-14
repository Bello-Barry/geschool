import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Pencil, Users, DoorOpen, GraduationCap, CalendarDays } from "lucide-react";
import { DeleteClassButton } from "@/components/forms/delete-class-button";

export default async function ClassDetailPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select(`
      *,
      academic_year:academic_year_id(id, name, is_current)
    `)
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!cls) notFound();

  const { data: students } = await supabaseAdmin
    .from("students")
    .select(`
      id,
      matricule,
      user:user_id(first_name, last_name)
    `)
    .eq("class_id", id)
    .eq("school_id", auth.schoolId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/classes`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{cls.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de la classe</CardTitle>
              <CardDescription>Détails de la classe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nom</p>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{cls.name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Niveau</p>
                  <p className="font-medium">{cls.level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacité</p>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{cls.capacity || "Non définie"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Salle</p>
                  <div className="flex items-center gap-1">
                    <DoorOpen className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">{cls.room_number || "-"}</p>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-500">Année scolaire</p>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <p className="font-medium">
                      {cls.academic_year?.name || "-"}
                      {cls.academic_year?.is_current ? " (En cours)" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Élèves ({students?.length || 0})</CardTitle>
              <CardDescription>Élèves inscrits dans cette classe</CardDescription>
            </CardHeader>
            <CardContent>
              {students && students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Matricule</th>
                        <th className="text-left py-3 px-4 font-semibold">Nom</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s: any) => {
                        const userData = s.user as unknown as { first_name: string; last_name: string } | null;
                        return (
                          <tr key={s.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{s.matricule}</td>
                            <td className="py-3 px-4">
                              {userData?.first_name} {userData?.last_name}
                            </td>
                            <td className="py-3 px-4">
                              <Link href={`/${ecole}/admin/students/${s.id}`}>
                                <Button variant="outline" size="sm">
                                  Voir
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">Aucun élève dans cette classe</p>
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
                <Link href={`/${ecole}/admin/classes/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <DeleteClassButton id={id} slug={ecole} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
