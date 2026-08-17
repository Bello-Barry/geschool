import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Users, BarChart3, MessageSquare, CalendarCheck2, Clock, NotebookPen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);
  const schoolId = auth.schoolId;

  const supabase = createAdminClient();

  const { data: teacherData } = await supabase
    .from("teachers")
    .select(`
      id,
      teacher_subjects(
        id,
        class:class_id(id, name)
      )
    `)
    .eq("user_id", auth.userId)
    .eq("school_id", schoolId)
    .single();

  const teacherId = teacherData?.id;
  const tsList = teacherData?.teacher_subjects || [];
  const classes = [...new Set((tsList || []).map((ts: any) => ({
    id: ts.class?.id,
    name: ts.class?.name
  })))];
  const tsIds = (tsList || []).map((ts: any) => ts.id);
  const classIds = classes.map((c: any) => c.id).filter(Boolean);

  // ─── Aujourd'hui ────────────────────────────────────────────────
  const todayISO = new Date().toISOString().split("T")[0];
  const isoWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1-7, ISO

  const [studentCount, absentToday, duesToday, gradesCount, todaySlots] = await Promise.all([
    classIds.length > 0
      ? supabase.from("students").select("id", { count: "exact" }).in("class_id", classIds).eq("school_id", schoolId)
      : Promise.resolve({ count: 0 }),
    classIds.length > 0
      ? supabase.from("attendance").select("id", { count: "exact" }).in("class_id", classIds).eq("school_id", schoolId).eq("date", todayISO).is("schedule_slot_id", null).eq("status", "absent")
      : Promise.resolve({ count: 0 }),
    tsIds.length > 0
      ? supabase.from("assignments").select("id", { count: "exact" }).in("class_id", classIds).eq("school_id", schoolId).eq("status", "published").eq("due_date", todayISO)
      : Promise.resolve({ count: 0 }),
    teacherId
      ? supabase.from("grades").select("id", { count: "exact" }).in("school_id", [schoolId])
      : Promise.resolve({ count: 0 }),
    tsIds.length > 0
      ? supabase
          .from("schedule_slots")
          .select("id, start_time, end_time, room_number, class:class_id(id, name), teacher_subject:teacher_subject_id(subject:subject_id(name))")
          .eq("school_id", schoolId)
          .in("teacher_subject_id", tsIds)
          .eq("day_of_week", isoWeekday)
          .order("start_time")
      : Promise.resolve({ data: [] }),
  ]);

  const slotsToday = todaySlots.data || [];
  const nextSlot = slotsToday.find((s: any) => s.start_time >= new Date().toTimeString().slice(0, 5)) || slotsToday[0];

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
            <CardTitle className="text-xs md:text-sm font-medium">Élèves</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{studentCount.count || 0}</div>
            <p className="text-[11px] text-muted-foreground">Dans mes classes</p>
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

      {/* Aujourd'hui — KPIs temps réel */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Aujourd'hui
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Cours</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{slotsToday.length}</div>
              <p className="text-[11px] text-muted-foreground">aujourd'hui</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Absents</CardTitle>
              <CalendarCheck2 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{absentToday.count || 0}</div>
              <p className="text-[11px] text-muted-foreground">aujourd'hui</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Devoirs</CardTitle>
              <NotebookPen className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{duesToday.count || 0}</div>
              <p className="text-[11px] text-muted-foreground">échéance aujourd'hui</p>
            </CardContent>
          </Card>
          <Link href={`/${slug}/teacher/grades`} className="block">
            <Card className="hover:bg-muted/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">Notes saisies</CardTitle>
                <BarChart3 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <div className="text-xl md:text-2xl font-bold">{gradesCount.count || 0}</div>
                <p className="text-[11px] text-muted-foreground">enregistrées</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Prochain cours du jour */}
      {nextSlot && (
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {nextSlot.start_time} — {nextSlot.end_time}
            </CardTitle>
            <CardDescription>
              {(nextSlot.teacher_subject as any)?.subject?.name ?? "Matière"}
              {nextSlot.class ? ` · ${(nextSlot.class as any)?.name}` : ""}
              {nextSlot.room_number ? ` · Salle ${nextSlot.room_number}` : ""}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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