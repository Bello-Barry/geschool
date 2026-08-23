"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format-currency";

export interface PaymentHistoryRow {
  id: string;
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

const PAGE_SIZE = 20;

function statusBadge(status: string) {
  if (status === "confirmed")
    return (
      <Badge variant="secondary" className="gap-1 text-emerald-700 bg-emerald-50">
        <CheckCircle2 className="h-3 w-3" /> Confirmé
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="secondary" className="gap-1 text-amber-700 bg-amber-50">
        <Clock className="h-3 w-3" /> En attente
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1 text-red-600 bg-red-50">
      <XCircle className="h-3 w-3" /> Rejeté
    </Badge>
  );
}

export function PaymentsHistory({ rows }: { rows: PaymentHistoryRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [school, setSchool] = useState<string>("all");
  const [page, setPage] = useState(1);

  const schools = useMemo(
    () => Array.from(new Set(rows.map((r) => r.schoolName).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (school !== "all" && r.schoolName !== school) return false;
      if (!q) return true;
      return (
        (r.schoolName ?? "").toLowerCase().includes(q) ||
        (r.studentName ?? "").toLowerCase().includes(q) ||
        (r.matricule ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, status, school]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher école, élève, matricule..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tous statuts ({rows.length})</option>
          <option value="confirmed">Confirmé</option>
          <option value="pending">En attente</option>
          <option value="rejected">Rejeté</option>
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={school}
          onChange={(e) => {
            setSchool(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Toutes les écoles</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-3 px-4 font-semibold">École</th>
              <th className="py-3 px-4 font-semibold">Élève</th>
              <th className="py-3 px-4 font-semibold">Montant</th>
              <th className="py-3 px-4 font-semibold">Méthode</th>
              <th className="py-3 px-4 font-semibold">Statut</th>
              <th className="py-3 px-4 font-semibold">Déclaré le</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => (
              <tr key={p.id} className="border-b hover:bg-muted/50">
                <td className="py-3 px-4">{p.schoolName ?? "-"}</td>
                <td className="py-3 px-4">
                  {p.studentName ?? "-"}
                  <span className="text-xs text-muted-foreground ml-2">{p.matricule}</span>
                </td>
                <td className="py-3 px-4 font-medium">{formatCurrency(p.amount ?? 0)}</td>
                <td className="py-3 px-4">
                  {p.paymentMethod ? (METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : "-"}
                </td>
                <td className="py-3 px-4">{statusBadge(p.status)}</td>
                <td className="py-3 px-4">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "-"}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun paiement ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} / {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>
              Précédent
            </Button>
            <span>
              {pageSafe} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
