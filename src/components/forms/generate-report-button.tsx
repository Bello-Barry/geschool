"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface GenerateReportButtonProps {
  studentId: string;
  termId: string;
}

export default function GenerateReportButton({
  studentId,
  termId,
}: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, termId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la génération");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {loading ? "Génération..." : "Générer le bulletin"}
    </Button>
  );
}
