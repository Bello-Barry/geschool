"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, AlertCircle, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils/formatters";

type Status = "present" | "absent" | "late" | "excused";

interface Student {
  id: string;
  matricule: string;
  user: { first_name: string; last_name: string } | null;
}

interface ExistingRecord {
  student_id: string;
  status: Status;
  reason: string | null;
}

interface AttendanceFormProps {
  classId: string;
  date: Date;
  students: Student[];
  existingRecords: ExistingRecord[];
}

const STATUS_ICONS: Record<Status, typeof Check> = {
  present: Check,
  absent: X,
  late: Clock,
  excused: AlertCircle,
};

const STATUS_LABELS: Record<Status, string> = {
  present: "Présent",
  absent: "Absent",
  late: "Retard",
  excused: "Excusé",
};

const STATUS_COLORS: Record<Status, string> = {
  present: "bg-green-500 text-white border-green-500",
  absent: "bg-red-500 text-white border-red-500",
  late: "bg-yellow-500 text-white border-yellow-500",
  excused: "bg-blue-500 text-white border-blue-500",
};

const STATUS_OUTLINES: Record<Status, string> = {
  present: "text-green-600 border-green-200 hover:bg-green-50",
  absent: "text-red-600 border-red-200 hover:bg-red-50",
  late: "text-yellow-600 border-yellow-200 hover:bg-yellow-50",
  excused: "text-blue-600 border-blue-200 hover:bg-blue-50",
};

export function AttendanceForm({ classId, date, students, existingRecords }: AttendanceFormProps) {
  const { toast } = useToast();
  const dateStr = date.toISOString().split("T")[0];
  const [saving, setSaving] = useState(false);

  const existingMap = new Map(existingRecords.map(r => [r.student_id, r]));
  const defaultStatus = (sid: string): Status => (existingMap.get(sid)?.status as Status) || "present";
  const defaultReason = (sid: string): string => existingMap.get(sid)?.reason || "";

  const [statuses, setStatuses] = useState<Record<string, Status>>(() => {
    const s: Record<string, Status> = {};
    students.forEach(st => { s[st.id] = defaultStatus(st.id); });
    return s;
  });

  const [reasons, setReasons] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    students.forEach(st => { r[st.id] = defaultReason(st.id); });
    return r;
  });

  const setStatus = useCallback((studentId: string, status: Status) => {
    setStatuses(prev => ({ ...prev, [studentId]: status }));
  }, []);

  const setReason = useCallback((studentId: string, reason: string) => {
    setReasons(prev => ({ ...prev, [studentId]: reason }));
  }, []);

  const markAllPresent = useCallback(() => {
    const allPresent: Record<string, Status> = {};
    students.forEach(st => { allPresent[st.id] = "present"; });
    setStatuses(allPresent);
  }, [students]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const records = students.map(st => ({
        student_id: st.id,
        status: statuses[st.id],
        reason: reasons[st.id] || undefined,
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, date: dateStr, records }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast({ title: "Présences enregistrées", description: `Appel du ${formatDate(date)} sauvegardé.` });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Échec de la sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [classId, dateStr, students, statuses, reasons, toast]);

  const statusButtons = (studentId: string) => {
    const current = statuses[studentId];
    const statuses_list: Status[] = ["present", "absent", "late", "excused"];
    return (
      <div className="flex justify-center gap-1">
        {statuses_list.map(s => {
          const Icon = STATUS_ICONS[s];
          const active = current === s;
          return (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className={`h-8 w-8 p-0 shadow-none ${active ? STATUS_COLORS[s] : STATUS_OUTLINES[s]}`}
              onClick={() => setStatus(studentId, s)}
              title={STATUS_LABELS[s]}
              type="button"
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Registre de présence</CardTitle>
          <CardDescription>Cochez le statut de chaque élève pour aujourd'hui.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllPresent} type="button">Cocher tous présents</Button>
          <Button className="flex gap-2" onClick={handleSave} disabled={saving} type="button">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Élève</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead>Remarque / Justification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.user?.last_name} {student.user?.first_name}
                  </TableCell>
                  <TableCell>{statusButtons(student.id)}</TableCell>
                  <TableCell>
                    <input
                      type="text"
                      placeholder="Ajouter une note..."
                      className="w-full bg-transparent border-none text-sm focus:ring-0"
                      value={reasons[student.id] || ""}
                      onChange={e => setReason(student.id, e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
