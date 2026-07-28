"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface TeacherCompletionListProps {
  assignmentId: string;
  students: Student[];
  completedIds: Set<string>;
  isTdTp: boolean;
}

export function TeacherCompletionList({ assignmentId, students, completedIds: initial, isTdTp }: TeacherCompletionListProps) {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const id of initial) map[id] = true;
    return map;
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const toggleStudent = async (studentId: string, current: boolean) => {
    setLoadingId(studentId);
    try {
      const method = current ? "DELETE" : "POST";
      const res = await fetch(`/api/assignments/${assignmentId}/completions`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (res.ok) {
        setCompletedMap((prev) => ({ ...prev, [studentId]: !current }));
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun élève dans cette classe</p>;
  }

  return (
    <div className="space-y-1">
      {students.map((s) => {
        const isCompleted = completedMap[s.id] || false;
        const isLoading = loadingId === s.id;
        return (
          <div
            key={s.id}
            className={`flex items-center justify-between p-3 rounded-md ${
              isTdTp ? "hover:bg-gray-50 cursor-pointer" : ""
            } ${isCompleted ? "bg-green-50/50" : ""}`}
          >
            <span className="text-sm font-medium">
              {s.lastName} {s.firstName}
            </span>
            {isTdTp ? (
              <Button
                variant={isCompleted ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStudent(s.id, isCompleted)}
                disabled={isLoading}
                className={`shrink-0 ${isCompleted ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCompleted ? (
                  <><Check className="h-4 w-4 mr-1" /> Validé</>
                ) : (
                  "À valider"
                )}
              </Button>
            ) : (
              <span className={`text-sm ${isCompleted ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                {isCompleted ? "A coché fait" : "Pas encore fait"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}