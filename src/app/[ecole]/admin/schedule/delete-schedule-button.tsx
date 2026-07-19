"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteScheduleButton({ id }: { id: string; slug?: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce créneau définitivement ?")) return;
    try {
      const res = await fetch(`/api/schedule-slots/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression");
        return;
      }
      router.refresh();
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleDelete}>
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}
