import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, NotebookPen, CalendarCheck2 } from "lucide-react";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "student") redirect(`/${slug}/login`);

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("students")
    .select(`
      id,
      matricule,
      class_id,
      user:user_id(first_name, last_name, email),
      class:class_id(name, level)
    `)
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!student) redirect(`/${slug}/login`);

  const userData = unwrapJoin(student.user) as { first_name: string; last_name: string; email: string } | null;
  const classInfo = unwrapJoin(student.class) as { name: string; level: string } | null;

  const { data: recentGrades } = await supabase
    .from("grades")
    .select(`
      id,
      score,
      max_score,
      grade_type,
      date,
      subject:subject_id(name, coefficient),
      term:term_id(name, is_current)
    `)
    .eq("student_id", student.id)
    .order("date", { ascending: false })
    .limit(10);

  const grades = recentGrades as unknown as Array<{
    id: string; score: number; max_score: number; grade_type: string; date: string;
    subject: { name: string; coefficient: number } | null;
    term: { name: string; is_current: boolean } | null;
  }> | null;

  const allScores = grades?.filter(g => g.score != null).map(g => g.score) || [];
  const average = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
    : null;

  // ─── Aujourd'hui ────────────────────────────────────────────────
  const todayISO = new Date().toISOString().split("T")[0];
  const isoWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1-7, ISO

  const [attendanceToday, assignmentsToday, todaySlots] = await Promise.all([
    supabase
      .from("attendance")
      .select("status")
      .eq("student_id", student.id)
      .eq("school_id", auth.schoolId)
      .eq("date", todayISO)
      .is("schedule_slot_id", null)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id", { count: "exact" })
      .eq("class_id", student.class_id)
      .eq("school_id", auth.schoolId)
      .eq("status", "published")
      .eq("due_date", todayISO),
    student.class_id
      ? supabase
          .from("schedule_slots")
          .select("id, start_time, end_time, room_number, teacher_subject:teacher_subject_id(subject:subject_id(name))")
          .eq("school_id", auth.schoolId)
          .eq("class_id", student.class_id)
          .eq("day_of_week", isoWeekday)
          .order("start_time")
      : Promise.resolve({ data: [] }),
  ]);

  const slotsToday = todaySlots.data || [];
  const nextSlot = slotsToday.find((s: any) => s.start_time >= new Date().toTimeString().slice(0, 5)) || slotsToday[0];
  const attendanceStatus = (attendanceToday as any)?.data?.status ?? (attendanceToday as any)?.status;

  const gradeTypeLabel = (t: string) => {
    const map: Record<string, string> = { homework: "Devoir", test: "Interro", exam: "Composition" };
    return map[t] || t;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Bonjour, {userData?.first_name} {userData?.last_name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Bienvenue sur votre espace élève</p>
      </div>

      {/* Stats — 2 cols on mobile, 3 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <Card>
          <CardHeader className="space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Classe</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{classInfo?.name || "-"}</div>
            <p className="text-[11px] text-muted-foreground">{classInfo?.level || ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Moyenne</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{average !== null ? `${average}/20` : "N/A"}</div>
            <p className="text-[11px] text-muted-foreground">Dernières notes</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{allScores.length}</div>
            <p className="text-[11px] text-muted-foreground">Enregistrées</p>
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
              <CardTitle className="text-xs md:text-sm font-medium">Proch. cours</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">
                {nextSlot ? nextSlot.start_time : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {(nextSlot as any)?.teacher_subject?.subject?.name ?? "pas de cours"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Devoirs</CardTitle>
              <NotebookPen className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{assignmentsToday.count || 0}</div>
              <p className="text-[11px] text-muted-foreground">à rendre aujourd'hui</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Présence</CardTitle>
              <CalendarCheck2 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">
                {attendanceStatus === "present" ? "Présent" : attendanceStatus === "absent" ? "Absent" : attendanceStatus === "late" ? "En retard" : attendanceStatus === "excused" ? "Excusé" : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground">statut du jour</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
              <CardTitle className="text-xs md:text-sm font-medium">Cours du jour</CardTitle>
              <Clock className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="text-xl md:text-2xl font-bold">{slotsToday.length}</div>
              <p className="text-[11px] text-muted-foreground">au programme</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/${slug}/student/messages`} className="min-h-[44px]">
          <Button className="w-full h-12 sm:h-14 text-xs sm:text-sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2 shrink-0" /> Messages
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Dernières notes</h2>
          <Link href={`/${slug}/student/grades`}>
            <Button variant="outline" size="sm" className="text-xs h-8">Voir tout</Button>
          </Link>
        </div>
        {grades && grades.length > 0 ? (
          <div className="space-y-2">
            {/* Mobile: cards */}
            <div className="block md:hidden space-y-2">
              {grades.slice(0, 5).map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium truncate">{g.subject?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {gradeTypeLabel(g.grade_type)} — {new Date(g.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant={g.score >= 10 ? "default" : "destructive"} className="shrink-0 text-xs">
                    {g.score}/{g.max_score}
                  </Badge>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Matière</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Trimestre</th>
                    <th className="text-left py-3 px-4 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">{new Date(g.date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4">{g.subject?.name || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">{gradeTypeLabel(g.grade_type)}</Badge>
                      </td>
                      <td className="py-3 px-4">{g.term?.name || "-"}</td>
                      <td className="py-3 px-4 font-semibold">{g.score}/{g.max_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Aucune note pour le moment</p>
        )}
      </div>
    </div>
  );
}
