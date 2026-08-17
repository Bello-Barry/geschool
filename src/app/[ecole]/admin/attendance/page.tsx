import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils/formatters";

export default async function AdminAttendancePage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

interface AttendanceSummary {
  class_id: string;
  class_name: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

const summaries: AttendanceSummary[] = [];

if (classes) {
  for (const cls of classes) {
    const { data: attRecords } = await supabaseAdmin
      .from("attendance")
      .select("status, schedule_slot_id")
      .eq("class_id", cls.id)
      .is("schedule_slot_id", null)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .lte("date", today.toISOString().split("T")[0]);

      if (attRecords && attRecords.length > 0) {
        summaries.push({
          class_id: cls.id,
          class_name: cls.name,
          total: attRecords.length,
          present: attRecords.filter(r => r.status === "present").length,
          absent: attRecords.filter(r => r.status === "absent").length,
          late: attRecords.filter(r => r.status === "late").length,
          excused: attRecords.filter(r => r.status === "excused").length,
        });
      }
    }
  }

  const { data: recentAttendance } = await supabaseAdmin
    .from("attendance")
    .select(`
      id, date, status,
      student:student_id(matricule, user:user_id(first_name, last_name)),
      class:class_id(name),
      schedule_slot:schedule_slot_id(start_time, end_time, teacher_subject:teacher_subject_id(subject:subject_id(name)))
    `)
    .eq("school_id", schoolId)
    .gte("date", weekAgo.toISOString().split("T")[0])
    .lte("date", today.toISOString().split("T")[0])
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Présences</h1>
        <p className="text-gray-600 mt-2">
          Consultation des présences — 7 derniers jours
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaries.map(s => {
          const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
          return (
            <Card key={s.class_id}>
              <CardHeader>
                <CardTitle className="text-sm">{s.class_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{rate}%</p>
                <p className="text-xs text-gray-500">
                  {s.present} présents, {s.absent} absents, {s.late} retards, {s.excused} excusés
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {summaries.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500">Aucune donnée de présence cette semaine</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registre détaillé (7 derniers jours)</CardTitle>
          <CardDescription>Toutes les entrées de présence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Élève</th>
                  <th className="text-left py-3 px-4 font-semibold">Classe</th>
                  <th className="text-left py-3 px-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance && recentAttendance.length > 0 ? (
                  recentAttendance.map((rec: any) => {
                    const studentInfo = rec.student as unknown as { matricule: string; user: { first_name: string; last_name: string } | null } | null;
                    const classInfo = rec.class as unknown as { name: string } | null;
                    return (
                      <tr key={rec.id} className="border-b hover:bg-neutral-50">
                        <td className="py-3 px-4">{formatDate(rec.date)}</td>
                        <td className="py-3 px-4">
                          {studentInfo?.user?.last_name} {studentInfo?.user?.first_name}
                          <span className="text-xs text-neutral-400 ml-2">{studentInfo?.matricule}</span>
                        </td>
                        <td className="py-3 px-4">{classInfo?.name}</td>
                        <td className="py-3 px-4">
                          {(() => {
                            const slot = rec.schedule_slot as unknown as {
                              start_time?: string;
                              end_time?: string;
                              teacher_subject?: { subject?: { name?: string } };
                            } | null;
                            if (!slot) return <StatusBadge status={rec.status as any} />;
                            const subject = slot.teacher_subject?.subject?.name ?? "Cours";
                            const time = `${slot.start_time?.slice(0, 5) ?? ""}–${slot.end_time?.slice(0, 5) ?? ""}`;
                            return (
                              <div className="flex items-center gap-2">
                                <StatusBadge status={rec.status as any} />
                                <span className="text-xs text-neutral-500">{subject} · {time}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Aucune saisie de présence cette semaine
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
