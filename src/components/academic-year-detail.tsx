"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Calendar } from "lucide-react";

interface Term {
  id: string;
  name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface AcademicYearDetailProps {
  yearId: string;
  slug: string;
  terms: Term[];
  yearStartDate: string;
  yearEndDate: string;
}

export function AcademicYearDetail({
  yearId,
  slug,
  terms: initialTerms,
  yearStartDate,
  yearEndDate,
}: AcademicYearDetailProps) {
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [editing, setEditing] = useState<Record<string, { start_date: string; end_date: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  const handleDateChange = (termId: string, field: "start_date" | "end_date", value: string) => {
    setEditing((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        start_date: terms.find((t) => t.id === termId)?.start_date || "",
        end_date: terms.find((t) => t.id === termId)?.end_date || "",
        ...prev[termId],
        [field]: value,
      },
    }));
  };

  const saveTerm = async (termId: string) => {
    const changes = editing[termId];
    if (!changes) return;

    setSaving(termId);
    try {
      const res = await fetch(`/api/terms/${termId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error("Erreur sauvegarde");

      const updated = await res.json();
      setTerms((prev) => prev.map((t) => (t.id === termId ? { ...t, ...updated } : t)));
      setEditing((prev) => {
        const next = { ...prev };
        delete next[termId];
        return next;
      });
    } catch {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const activateTerm = async (termId: string) => {
    setActivating(termId);
    try {
      const res = await fetch(`/api/terms/${termId}/activate`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur activation");

      setTerms((prev) =>
        prev.map((t) => ({ ...t, is_current: t.id === termId }))
      );
    } catch {
      alert("Erreur lors de l'activation");
    } finally {
      setActivating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Trimestres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {terms.map((term) => {
          const isEditing = !!editing[term.id];
          const dates = editing[term.id] || {
            start_date: term.start_date,
            end_date: term.end_date,
          };

          return (
            <div
              key={term.id}
              className={`rounded-lg border p-4 transition-colors ${
                term.is_current ? "border-green-500 bg-green-50" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-lg">{term.name}</span>
                  {term.is_current ? (
                    <Badge className="bg-green-600 hover:bg-green-600">Actuel</Badge>
                  ) : (
                    <Badge variant="secondary">Inactif</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Button
                      size="sm"
                      onClick={() => saveTerm(term.id)}
                      disabled={saving === term.id}
                    >
                      {saving === term.id ? (
                        <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Sauvegarder
                    </Button>
                  ) : (
                    !term.is_current && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateTerm(term.id)}
                        disabled={activating === term.id}
                      >
                        {activating === term.id ? (
                          <span className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Activer
                      </Button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Début</label>
                  <Input
                    type="date"
                    value={dates.start_date}
                    onChange={(e) => handleDateChange(term.id, "start_date", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fin</label>
                  <Input
                    type="date"
                    value={dates.end_date}
                    onChange={(e) => handleDateChange(term.id, "end_date", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {terms.length === 0 && (
          <div className="text-center py-8 text-muted-foreground italic">
            Aucun trimestre configuré. Les trimestres sont créés automatiquement avec l&apos;année scolaire.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
