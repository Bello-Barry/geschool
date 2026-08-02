"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Loader2, Check, X } from "lucide-react";
import Link from "next/link";
import { DetailSkeleton } from "@/components/ui/skeletons";

interface Attendance {
  student_id: string;
  status: "present" | "absent";
  marked_at: string;
  student?: {
    id: string;
    user: { first_name: string; last_name: string } | null;
  };
}

interface Props {
  sessionId: string;
}

export function TdSessionDetailClient({ sessionId }: Props) {
  const params = useParams();
  const ecole = params?.ecole as string;
  const [session, setSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [sessionRes, attendanceRes] = await Promise.all([
      fetch(`/api/td/${sessionId}`),
      fetch(`/api/td/${sessionId}/attendance`),
    ]);

    if (sessionRes.ok) {
      const json = await sessionRes.json();
      setSession(json.data);

      if (json.data.class?.id) {
        const studentsRes = await fetch(`/api/students?class_id=${json.data.class.id}`);
        if (studentsRes.ok) {
          const sJson = await studentsRes.json();
          setStudents(sJson.data || []);
        }
      }
    }

    if (attendanceRes.ok) {
      const json = await attendanceRes.json();
      const attMap: Record<string, "present" | "absent"> = {};
      (json.data || []).forEach((a: Attendance) => {
        attMap[a.student_id] = a.status;
      });
      setAttendance(attMap);
    }

    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const markAttendance = async (studentId: string, status: "present" | "absent") => {
    setSaving(studentId);
    setAttendance(p => ({ ...p, [studentId]: status }));
    await fetch(`/api/td/${sessionId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, status }),
    });
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Session introuvable</p>
        <Button variant="outline" asChild><Link href={`/${ecole}/teacher/td`}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>
      </div>
    );
  }

  const presentCount = Object.values(attendance).filter(v => v === "present").length;

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href={`/${ecole}/teacher/td`}><ArrowLeft className="mr-2 h-4 w-4" />Retour aux TD/TP</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <p className="text-muted-foreground">
          {session.subject?.name} • {session.class?.name} • {new Date(session.session_date).toLocaleDateString("fr-FR")}
        </p>
        <div className="flex gap-2 mt-2">
          <StatusBadge status={session.status === "published" ? "published" : "draft"} />
          <Badge variant="secondary">{session.type.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Présences ({presentCount}/{students.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-muted-foreground">Aucun élève dans cette classe</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student: any) => {
                    const status = attendance[student.id];
                    return (
                      <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">
                          {student.user?.first_name} {student.user?.last_name}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant={status === "present" ? "default" : "outline"}
                            size="sm"
                            onClick={() => markAttendance(student.id, "present")}
                            disabled={saving === student.id}
                            className={status === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {saving === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Présent
                          </Button>
                          <Button
                            variant={status === "absent" ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => markAttendance(student.id, "absent")}
                            disabled={saving === student.id}
                          >
                            {saving === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            Absent
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {session.description && (
            <Card className="mb-4">
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{session.description}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              {session.materials?.length > 0 ? (
                <ul className="space-y-2">
                  {session.materials.map((m: any) => (
                    <li key={m.id} className="text-sm p-2 border rounded flex items-center gap-2">
                      <span className="truncate">{m.file_name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun document</p>
              )}
            </CardContent>
          </Card>

          <Button
            variant={session.status === "published" ? "outline" : "default"}
            className="w-full mt-4"
            onClick={async () => {
              const newStatus = session.status === "published" ? "draft" : "published";
              await fetch(`/api/td/${sessionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
              });
              load();
            }}
          >
            {session.status === "published" ? "Dépublier" : "Publier"}
          </Button>
        </div>
      </div>
    </div>
  );
}