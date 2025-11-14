import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Users, BarChart3, MessageSquare } from "lucide-react";

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Vérifier le rôle
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "teacher") {
    redirect("/admin");
  }

  // Récupérer les classes de l'enseignant
  const { data: teacherData } = await supabase
    .from("teachers")
    .select(`
      id,
      teacher_subjects(
        class:class_id(id, name)
      )
    `)
    .eq("user_id", session.user.id)
    .eq("school_id", schoolId)
    .single();

  const classes = [...new Set((teacherData?.teacher_subjects || []).map((ts: any) => ({
    id: ts.class?.id,
    name: ts.class?.name
  })))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord Enseignant</h1>
        <p className="text-gray-600 mt-2">Gérez vos classes et évaluations</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes classes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-gray-600">Classes assurées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-gray-600">À compléter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-gray-600">Non lus</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/teacher/grades">
            <Button className="w-full">Saisir les notes</Button>
          </Link>
          <Link href="/teacher/attendance">
            <Button className="w-full" variant="outline">Absences</Button>
          </Link>
          <Link href="/teacher/classes">
            <Button className="w-full" variant="outline">Mes classes</Button>
          </Link>
          <Link href="/teacher/messages">
            <Button className="w-full" variant="outline">Messages</Button>
          </Link>
        </div>
      </div>

      {/* Classes list */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mes classes</CardTitle>
            <CardDescription>Cliquez pour gérer une classe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls: any) => (
                <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow border">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold">{cls.name}</p>
                          <p className="text-xs text-gray-600">Cliquez pour gérer</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
