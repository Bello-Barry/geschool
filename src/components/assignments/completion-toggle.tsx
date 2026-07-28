"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";

interface CompletionToggleProps {
  assignmentId: string;
  isCompleted: boolean;
  type: "devoir_maison" | "td" | "tp";
}

export function CompletionToggle({ assignmentId, isCompleted: initial, type }: CompletionToggleProps) {
  const [isCompleted, setIsCompleted] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isTdTp = type === "td" || type === "tp";

  const toggle = async () => {
    setLoading(true);
    try {
      const method = isCompleted ? "DELETE" : "POST";
      const res = await fetch(`/api/assignments/${assignmentId}/completions`, { method });
      if (res.ok) setIsCompleted(!isCompleted);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (isTdTp) {
    return (
      <Badge variant={isCompleted ? "default" : "outline"} className={`shrink-0 ${isCompleted ? "bg-green-600" : "text-muted-foreground"}`}>
        {isCompleted ? "Validé par le professeur" : "En attente de validation"}
      </Badge>
    );
  }

  return (
    <Button
      variant={isCompleted ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`shrink-0 ${isCompleted ? "border-green-500 text-green-700" : ""}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isCompleted ? (
        <><X className="h-4 w-4 mr-1" /> Annuler</>
      ) : (
        <><Check className="h-4 w-4 mr-1" /> Fait</>
      )}
    </Button>
  );
}
