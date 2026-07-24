"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: string;
  matricule: string;
  user: { first_name: string; last_name: string } | null;
}

interface GradeEntryFormProps {
  students: Student[];
  subjectId: string;
  termId: string;
  subjectName: string;
  className: string;
  termName: string;
  existingGradesByStudent?: Record<string, { homework: string; test: string; exam: string }>;
}

type StudentGrades = Record<string, { homework: string; test: string; exam: string }>;

export function GradeEntryForm({ students, subjectId, termId, subjectName, className, termName, existingGradesByStudent = {} }: GradeEntryFormProps) {
  const params = useParams();
  const slug = params?.ecole as string;
  const [grades, setGrades] = useState<StudentGrades>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: StudentGrades = {};
    for (const s of students) {
      initial[s.id] = existingGradesByStudent[s.id] || { homework: "", test: "", exam: "" };
    }
    setGrades(initial);
  }, [students, existingGradesByStudent]);

  const updateGrade = useCallback((studentId: string, type: "homework" | "test" | "exam", value: string) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId]!, [type]: value },
    }));
    setSaved(false);
    setError(null);
  }, []);

  const calcAverage = (studentId: string): number => {
    const g = grades[studentId];
    if (!g) return 0;
    const hw = parseFloat(g.homework) || 0;
    const test = parseFloat(g.test) || 0;
    const exam = parseFloat(g.exam) || 0;
    if (hw === 0 && test === 0 && exam === 0) return 0;
    return Math.round(((hw + test + exam * 2) / 4) * 100) / 100;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const student of students) {
        const g = grades[student.id];
        if (!g) continue;
        const gradeEntries = [];
        if (g.homework) gradeEntries.push({ grade_type: "homework" as const, score: parseFloat(g.homework) });
        if (g.test) gradeEntries.push({ grade_type: "test" as const, score: parseFloat(g.test) });
        if (g.exam) gradeEntries.push({ grade_type: "exam" as const, score: parseFloat(g.exam) });
        if (gradeEntries.length === 0) continue;

        const res = await fetch("/api/grades/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: student.id,
            subject_id: subjectId,
            term_id: termId,
            grades: gradeEntries,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Failed for ${student.matricule}`);
        }
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${slug}/teacher/grades`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saisie des notes</h1>
          <p className="text-muted-foreground">{subjectName} — {className} — {termName}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Liste des élèves</CardTitle>
            <CardDescription>Saisissez les notes sur 20 pour chaque type d&apos;évaluation.</CardDescription>
          </div>
          <Button className="flex gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Sauvegarde..." : "Sauvegarder tout"}
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              Notes sauvegardées avec succès.
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Élève</TableHead>
                  <TableHead>Devoir</TableHead>
                  <TableHead>Interro</TableHead>
                  <TableHead>Compo</TableHead>
                  <TableHead className="text-right">Moyenne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const avg = calcAverage(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{student.user?.last_name} {student.user?.first_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{student.matricule}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          className="w-20"
                          placeholder="—"
                          value={grades[student.id]?.homework ?? ""}
                          onChange={(e) => updateGrade(student.id, "homework", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          className="w-20"
                          placeholder="—"
                          value={grades[student.id]?.test ?? ""}
                          onChange={(e) => updateGrade(student.id, "test", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          className="w-20"
                          placeholder="—"
                          value={grades[student.id]?.exam ?? ""}
                          onChange={(e) => updateGrade(student.id, "exam", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={avg >= 10 ? "default" : "secondary"}>
                          {avg.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" asChild>
          <Link href={`/${slug}/teacher/grades`}>Annuler</Link>
        </Button>
        <Button className="w-32" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
