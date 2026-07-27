"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function CompletionToggle({ assignmentId, isCompleted: initial }: { assignmentId: string; isCompleted: boolean }) {
  const [isCompleted, setIsCompleted] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    try {
      if (isCompleted) {
        const res = await fetch(`/api/assignments/${assignmentId}/completions`, { method: "DELETE" });
        if (res.ok) setIsCompleted(false);
      } else {
        const res = await fetch(`/api/assignments/${assignmentId}/completions`, { method: "POST" });
        if (res.ok) setIsCompleted(true);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isCompleted ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`shrink-0 ${isCompleted ? "border-green-500 text-green-700" : ""}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : isCompleted ? (
        <><X className="h-4 w-4 mr-1" /> Annuler</>
      ) : (
        <><Check className="h-4 w-4 mr-1" /> Fait</>
      )}
    </Button>
  );
}
