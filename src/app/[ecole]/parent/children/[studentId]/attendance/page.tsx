import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const statusLabels: Record<string, string> = {
    present: "Présent",
    absent: "Absent",
    late: "Retard",
    excused: "Excusé",
  };

  const statusColors: Record<string, string> = {
    present: "text-green-700 bg-green-50 border-green-200",
    absent: "text-red-700 bg-red-50 border-red-200",
    late: "text-yellow-700 bg-yellow-50 border-yellow-200",
    excused: "text-blue-700 bg-blue-50 border-blue-200",
  };

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
              <CardTitle className="text-sm text-gray-500">Présences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{presents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Absences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{absences}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Retards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{lates}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Excusés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{excused}</p>
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
                  className={`flex items-center justify-between p-3 rounded-lg border ${statusColors[rec.status] || ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{formatDate(rec.date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {rec.reason && (
                      <span className="text-sm text-gray-600 italic">{rec.reason}</span>
                    )}
                    <span className="text-sm font-semibold">{statusLabels[rec.status] || rec.status}</span>
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
