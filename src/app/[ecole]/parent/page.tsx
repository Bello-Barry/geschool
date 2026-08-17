import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, FileText, MessageSquare, DollarSign, GraduationCap, CalendarCheck2, NotebookPen } from "lucide-react";

export default async function ParentDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);
  const schoolId = auth.schoolId;
  const supabaseAdmin = createAdminClient();

  const { data: parentRow } = await (await createClient())
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", schoolId)
    .single();

  const { data: children } = await (await createClient())
    .from("student_parents")
    .select(`
      student:student_id(
        id,
        class_id,
        user:user_id(
          first_name,
          last_name
        ),
        class:class_id(name)
      )
    `)
    .eq("parent_id", parentRow?.id);

  const studentIds = (children || []).map((c: any) => c.student?.id).filter(Boolean);
  const studentClassIds = (children || []).map((c: any) => c.student?.class_id).filter(Boolean);

  // ─── Aujourd'hui ────────────────────────────────────────────────
  const todayISO = new Date().toISOString().split("T")[0];

  const [absentToday, duesToday, assignmentsToday, recentGrades] = await Promise.all([
    studentIds.length > 0
      ? supabaseAdmin.from("attendance").select("id, student:student_id(user:user_id(first_name, last_name))", { count: "exact" })
          .in("student_id", studentIds).eq("school_id", schoolId).eq("date", todayISO).is("schedule_slot_id", null).eq("status", "absent")
      : Promise.resolve({ count: 0, data: [] }),
    studentIds.length > 0
      ? supabaseAdmin.from("monthly_dues").select("id", { count: "exact" })
          .in("student_id", studentIds).eq("school_id", schoolId).lte("due_date", todayISO).neq("status", "paid")
      : Promise.resolve({ count: 0 }),
    studentClassIds.length > 0
      ? supabaseAdmin.from("assignments").select("id", { count: "exact" })
          .in("class_id", studentClassIds).eq("school_id", schoolId).eq("status", "published").eq("due_date", todayISO)
      : Promise.resolve({ count: 0 }),
    studentIds.length > 0
      ? supabaseAdmin.from("grades")
          .select("score, max_score, subject:subject_id(name), student:student_id(user:user_id(first_name, last_name))")
          .in("student_id", studentIds).eq("school_id", schoolId).limit(3).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Espace Parent</h1>
        <p className="text-sm text-muted-foreground mt-1">Suivi de la scolarité de vos enfants</p>
      </div>

      {/* Quick actions — grille 2 cols mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href={`/${slug}/parent/children`} className="min-h-[44px]">
          <Button className="w-full h-14 sm:h-16 flex flex-col gap-1 text-xs sm:text-sm">
            <BarChart3 className="h-5 w-5" />
            Notes
          </Button>
        </Link>
        <Link href={`/${slug}/parent/payments`} className="min-h-[44px]">
          <Button className="w-full h-14 sm:h-16 flex flex-col gap-1 text-xs sm:text-sm" variant="outline">
            <DollarSign className="h-5 w-5" />
            Paiements
          </Button>
        </Link>
        <Link href={`/${slug}/parent/messages`} className="min-h-[44px]">
          <Button className="w-full h-14 sm:h-16 flex flex-col gap-1 text-xs sm:text-sm" variant="outline">
            <MessageSquare className="h-5 w-5" />
            Messages
          </Button>
        </Link>
        <Link href={`/${slug}/parent/chatbot`} className="min-h-[44px]">
          <Button className="w-full h-14 sm:h-16 flex flex-col gap-1 text-xs sm:text-sm" variant="outline">
            <FileText className="h-5 w-5" />
            Aide IA
          </Button>
        </Link>
      </div>

      {/* Mes enfants */}
      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-base">Mes enfants</CardTitle>
          <CardDescription>Cliquez sur un enfant pour voir ses informations</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 space-y-3">
          {children && children.length > 0 ? (
            children.map((item: any, i: number) => (
              <Link key={i} href={`/${slug}/parent/children/${item.student.id}`} className="block min-h-[44px]">
                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: "var(--primary-color, #3B82F6)" }}
                  >
                    {(item.student.user?.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {item.student.user?.first_name} {item.student.user?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3 inline mr-1" />
                      {item.student.class?.name || "Classe non assignée"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 text-xs">
                    Voir
                  </Button>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun enfant associé pour le moment
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aujourd'hui — KPIs temps réel */}
      {studentIds.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4" /> Aujourd'hui
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">Absences</CardTitle>
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
                <div className="text-xl md:text-2xl font-bold">{assignmentsToday.count || 0}</div>
                <p className="text-[11px] text-muted-foreground">échéance aujourd'hui</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium">Échéances</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <div className="text-xl md:text-2xl font-bold">{duesToday.count || 0}</div>
                <p className="text-[11px] text-muted-foreground">impayées</p>
              </CardContent>
            </Card>
            <Link href={`/${slug}/parent/children`} className="block">
              <Card className="hover:bg-muted/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Note récente</CardTitle>
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="px-3 md:px-6">
                  <div className="text-xl md:text-2xl font-bold">
                    {recentGrades.data?.[0] ? `${recentGrades.data[0].score}/${recentGrades.data[0].max_score}` : "—"}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {(recentGrades.data as any)?.[0]?.subject?.name ?? "aucune note"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Alertes */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-yellow-900 text-sm">Informations importantes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6 text-yellow-800 space-y-1.5 text-sm">
          <p>• Consultez régulièrement les notes et présences de vos enfants</p>
          <p>• Mettez à jour vos informations de paiement si nécessaire</p>
          <p>• Utilisez l'assistant IA pour vos questions fréquentes</p>
        </CardContent>
      </Card>
    </div>
  );
}
