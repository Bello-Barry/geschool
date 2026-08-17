"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Trash2, Send, Download } from "lucide-react";

interface ReportRow {
  id: string;
  general_average: number | null;
  class_rank: number | null;
  total_students: number | null;
  status: string;
  generated_at: string | null;
  student?: unknown;
  term?: unknown;
}

interface ReportsActionsProps {
  reports: ReportRow[];
  downloadApiPath: string;
}

export function ReportsActions({ reports, downloadApiPath }: ReportsActionsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<"publish" | "delete" | "csv" | null>(null);

  const allIds = reports.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function batchPublish() {
    if (pending) return;
    setPending("publish");
    try {
      const res = await fetch("/api/reports/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error();
      toast.success("Bulletins publiés");
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error("Erreur", { description: "Impossible de publier les bulletins." });
    } finally {
      setPending(null);
    }
  }

  async function batchDelete() {
    if (pending) return;
    if (!confirm(`Supprimer définitivement ${selected.size} bulletin(s) ? Cette action est irréversible.`)) return;
    setPending("delete");
    try {
      const res = await fetch("/api/reports/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error();
      toast.success("Bulletins supprimés");
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error("Erreur", { description: "Impossible de supprimer les bulletins." });
    } finally {
      setPending(null);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (selected.size > 0) params.set("ids", [...selected].join(","));
    window.open(`/api/reports/export-csv?${params.toString()}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open("/api/reports/export-csv", "_blank")}>
          <FileDown className="h-3.5 w-3.5 mr-1" /> Exporter tout (CSV)
        </Button>
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/40">
          <span className="text-sm font-medium mr-auto">{selected.size} sélectionné(s)</span>
          <Button variant="outline" size="sm" className="text-xs" onClick={batchPublish} disabled={pending !== null}>
            {pending === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Publier
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={exportCsv} disabled={pending !== null}>
            <FileDown className="h-3.5 w-3.5 mr-1" /> Exporter CSV
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-red-600" onClick={batchDelete} disabled={pending !== null}>
            {pending === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
            Supprimer
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 font-semibold w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Sélectionner tout"
                />
              </th>
              <th className="text-left py-3 px-4 font-semibold">Élève</th>
              <th className="text-left py-3 px-4 font-semibold">Classe</th>
              <th className="text-left py-3 px-4 font-semibold">Trimestre</th>
              <th className="text-left py-3 px-4 font-semibold">Moyenne</th>
              <th className="text-left py-3 px-4 font-semibold">Rang</th>
              <th className="text-left py-3 px-4 font-semibold">Statut</th>
              <th className="text-left py-3 px-4 font-semibold">Généré le</th>
              <th className="text-right py-3 px-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((rec) => {
              const studentInfo = rec.student as unknown as {
                matricule?: string;
                user?: { first_name?: string; last_name?: string } | null;
                class?: { name?: string } | null;
              } | null;
              const termInfo = rec.term as unknown as { name?: string } | null;
              return (
                <tr key={rec.id} className="border-b hover:bg-neutral-50">
                  <td className="py-3 px-4">
                    <Checkbox
                      checked={selected.has(rec.id)}
                      onCheckedChange={() => toggleOne(rec.id)}
                      aria-label={`Sélectionner ${studentInfo?.user?.last_name ?? rec.id}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    {studentInfo?.user?.last_name} {studentInfo?.user?.first_name}
                    <span className="text-xs text-neutral-400 ml-2">{studentInfo?.matricule}</span>
                  </td>
                  <td className="py-3 px-4">{studentInfo?.class?.name ?? "-"}</td>
                  <td className="py-3 px-4">{termInfo?.name ?? "-"}</td>
                  <td className="py-3 px-4 font-medium">
                    {rec.general_average != null ? `${rec.general_average}/20` : "-"}
                  </td>
                  <td className="py-3 px-4">
                    {rec.class_rank != null
                      ? `${rec.class_rank}${rec.total_students ? ` / ${rec.total_students}` : ""}`
                      : "-"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={rec.status === "published" ? "default" : "outline"}>
                      {rec.status === "published" ? "Publié" : "Brouillon"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {rec.generated_at ? new Date(rec.generated_at).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <a href={`${downloadApiPath}/${rec.id}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Télécharger
                      </Button>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}