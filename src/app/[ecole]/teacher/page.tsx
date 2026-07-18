import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Users, BarChart3, MessageSquare } from "lucide-react";

export default async function TeacherDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);
  const schoolId = auth.schoolId;

  const supabase = await createClient();

  // Récupérer les classes de l'enseignant
  const { data: teacherData } = await supabase
    .from("teachers")
    .select(`
      id,
      teacher_subjects(
        class:class_id(id, name)
      )
    `)
    .eq("user_id", auth.userId)
    .eq("school_id", schoolId)
    .single();

  const classes = [...new Set((teacherData?.teacher_subjects || []).map((ts: any) => ({
    id: ts.class?.id,
    name: ts.class?.name
  })))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos classes et évaluations</p>
      </div>

      {/* Stat cards — 2 cols mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <Card>
          <CardHeader className="space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Mes classes</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{classes.length}</div>
            <p className="text-[11px] text-muted-foreground">Classes assurées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">
              <Link href={`/${slug}/teacher/grades`} className="text-primary">Saisir</Link>
            </div>
            <p className="text-[11px] text-muted-foreground">Saisie des notes</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Présences</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">
              {classes.length > 0 && classes[0]?.id ? (
                <Link href={`/${slug}/teacher/attendance/${classes[0].id}`} className="text-primary">Appel</Link>
              ) : <span className="text-muted-foreground">—</span>}
            </div>
            <p className="text-[11px] text-muted-foreground">Faire l'appel</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href={`/${slug}/teacher/grades`} className="min-h-[44px]">
          <Button className="w-full h-12 sm:h-14 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-2 shrink-0" /> Saisir notes
          </Button>
        </Link>
        {classes.length > 0 && classes[0]?.id && (
          <Link href={`/${slug}/teacher/attendance/${classes[0].id}`} className="min-h-[44px]">
            <Button className="w-full h-12 sm:h-14 text-xs sm:text-sm" variant="outline">
              <Users className="h-4 w-4 mr-2 shrink-0" /> Absences
            </Button>
          </Link>
        )}
        <Link href={`/${slug}/teacher/classes`} className="min-h-[44px]">
          <Button className="w-full h-12 sm:h-14 text-xs sm:text-sm" variant="outline">
            <BookOpen className="h-4 w-4 mr-2 shrink-0" /> Mes classes
          </Button>
        </Link>
        <Link href={`/${slug}/teacher/messages`} className="min-h-[44px]">
          <Button className="w-full h-12 sm:h-14 text-xs sm:text-sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2 shrink-0" /> Messages
          </Button>
        </Link>
      </div>

      {/* Classes list */}
      {classes.length > 0 && (
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base">Mes classes</CardTitle>
            <CardDescription>Cliquez pour gérer une classe</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map((cls: any) => (
                <Link key={cls.id} href={`/${slug}/teacher/attendance/${cls.id}`} className="block min-h-[44px]">
                  <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <BookOpen className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">Appel du jour</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
