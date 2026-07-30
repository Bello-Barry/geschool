"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, Landmark } from "lucide-react"
import { toast } from "sonner"
import { formatCFA } from "@/lib/utils/formatters"

interface ClassInfo {
  id: string
  name: string
}

interface TuitionFee {
  id: string
  class_id: string | null
  academic_year_id: string | null
  amount: number
  description: string | null
  due_date: string | null
  class: { id: string; name: string } | null
  academic_year: { id: string; name: string } | null
}

interface Props {
  classes: ClassInfo[]
  fees: TuitionFee[]
  academicYearId: string
}

export default function TuitionFeesConfig({ classes, fees, academicYearId }: Props) {
  const [config, setConfig] = useState<Record<string, { amount: string; dueDate: string }>>(() => {
    const initial: Record<string, { amount: string; dueDate: string }> = {}
    for (const cls of classes) {
      const existing = fees.find((f) => f.class_id === cls.id)
      initial[cls.id] = {
        amount: existing ? existing.amount.toString() : "",
        dueDate: existing ? existing.due_date?.split("T")[0] ?? "" : "",
      }
    }
    return initial
  })
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  async function saveFee(classId: string) {
    const entry = config[classId]
    if (!entry?.amount) {
      toast.error("Veuillez renseigner un montant")
      return
    }

    setSaving((prev) => ({ ...prev, [classId]: true }))

    try {
      const res = await fetch(`/api/tuition-fees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          academic_year_id: academicYearId,
          amount: Number(entry.amount),
          due_date: entry.dueDate || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur")
      }

      toast.success("Frais enregistrés pour " + (classes.find(c => c.id === classId)?.name || ""))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setSaving((prev) => ({ ...prev, [classId]: false }))
    }
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Frais de scolarité</CardTitle>
          <CardDescription>Aucune classe configurée pour cette année scolaire.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Landmark className="mx-auto h-10 w-10 mb-2 text-muted-foreground/40" />
            <p>Créez d'abord des classes dans la section dédiée.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {classes.map((cls) => {
        const isSaving = saving[cls.id] || false
        return (
          <Card key={cls.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {cls.name}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveFee(cls.id)}
                  disabled={isSaving || !config[cls.id]?.amount}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Montant mensuel
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 25000"
                      value={config[cls.id]?.amount || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [cls.id]: { amount: e.target.value, dueDate: prev[cls.id]?.dueDate ?? "" },
                        }))
                      }
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                      FCFA
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Date limite
                  </label>
                  <Input
                    type="date"
                    value={config[cls.id]?.dueDate || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        [cls.id]: { amount: prev[cls.id]?.amount ?? "", dueDate: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              {config[cls.id]?.amount && (
                <p className="text-xs text-muted-foreground mt-3">
                  Montant configuré : <span className="font-semibold">{formatCFA(Number(config[cls.id].amount))}</span>
                  {config[cls.id]?.dueDate && (
                    <> — Date limite : <span className="font-semibold">{new Date(config[cls.id].dueDate + "T00:00:00").toLocaleDateString("fr-FR")}</span></>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
