"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteClassButton({ id, slug }: { id: string; slug: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette classe ? Cette action est irréversible.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        const data = await res.json();
        setError(data.error || "Des élèves sont encore assignés à cette classe.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      router.push(`/${slug}/admin/classes`);
      router.refresh();
    } catch {
      setError("Erreur lors de la suppression");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="destructive" onClick={handleDelete} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
        Supprimer
      </Button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
