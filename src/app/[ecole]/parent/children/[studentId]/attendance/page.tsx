import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ ecole: string; studentId: string }>;
}) {
  const { ecole, studentId } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || auth.role !== "parent") redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) redirect(`/${ecole}`);

  const { data: link } = await supabaseAdmin
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id)
    .eq("student_id", studentId)
    .single();

  if (!link) redirect(`/${ecole}/parent/children`);

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, matricule, user:user_id(first_name, last_name), class:class_id(name)")
    .eq("id", studentId)
    .single();

  if (!student) redirect(`/${ecole}/parent/children`);

  const { data: attendanceRecords } = await supabaseAdmin
    .from("attendance")
    .select("id, date, status, reason")
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  const userInfo = unwrapJoin(student.user) as { first_name: string; last_name: string } | null;
  const classInfo = unwrapJoin(student.class) as { name: string } | null;

  const totalRecords = attendanceRecords?.length || 0;
  const absences = attendanceRecords?.filter(r => r.status === "absent").length || 0;
  const lates = attendanceRecords?.filter(r => r.status === "late").length || 0;
  const presents = attendanceRecords?.filter(r => r.status === "present").length || 0;
  const excused = attendanceRecords?.filter(r => r.status === "excused").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${ecole}/parent/children/${studentId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Retour à {userInfo?.first_name}
        </Link>
        <h1 className="text-3xl font-bold mt-2">
          Présences de {userInfo?.first_name} {userInfo?.last_name}
        </h1>
        <p className="text-gray-600 mt-1">
          {classInfo?.name} &middot; {student.matricule}
        </p>
      </div>

      {totalRecords > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Présences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success-600">{presents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Absences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-danger-600">{absences}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Retards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning-600">{lates}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Excusés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-info-600">{excused}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique des présences</CardTitle>
          <CardDescription>
            {totalRecords > 0
              ? `${totalRecords} entrée${totalRecords > 1 ? "s" : ""} enregistrée${totalRecords > 1 ? "s" : ""}`
              : "Aucune donnée de présence"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceRecords && attendanceRecords.length > 0 ? (
            <div className="space-y-3">
              {attendanceRecords.map((rec: any) => (
                <div
                  key={rec.id}
                  className="flex justify-between items-center p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{formatDate(rec.date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {rec.reason && (
                      <span className="text-sm text-neutral-600 italic">{rec.reason}</span>
                    )}
                    <StatusBadge status={rec.status as any} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">Aucune présence enregistrée pour cet enfant</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
