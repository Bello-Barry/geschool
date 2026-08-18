"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export interface PaymentExportRow {
  schoolName: string | null;
  studentName: string | null;
  matricule: string | null;
  amount: number | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement",
  check: "Chèque",
};

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusLabel(status: string): string {
  if (status === "confirmed") return "Confirmé";
  if (status === "pending") return "En attente";
  if (status === "rejected") return "Rejeté";
  return status;
}

export function PaymentsExport({ rows }: { rows: PaymentExportRow[] }) {
  function download() {
    const header = ["École", "Élève", "Matricule", "Montant (XAF)", "Méthode", "Statut", "Déclaré le"];
    const data = rows.map((p) => [
      p.schoolName ?? "",
      p.studentName ?? "",
      p.matricule ?? "",
      p.amount != null ? String(Math.round(p.amount)) : "",
      p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : "",
      statusLabel(p.status),
      p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "",
    ]);
    const csv = [header, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenus-plateforme-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={rows.length === 0} className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV ({rows.length})
    </Button>
  );
}