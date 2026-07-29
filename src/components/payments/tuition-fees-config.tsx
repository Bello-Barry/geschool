"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCFA } from "@/lib/utils/formatters"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
  slug: string
}

export default function TuitionFeesConfig({ classes, fees, academicYearId, slug }: Props) {
  const [config, setConfig] = useState<Record<string, { amount: string; dueDate: string }>>(() => {
    const initial: Record<string, { amount: string; dueDate: string }> = {}
    for (const cls of classes) {
      const existing = fees.find((f) => f.class_id === cls.id)
      initial[cls.id] = {
        amount: existing ? existing.amount.toString() : "",
        dueDate: existing?.due_date ? existing.due_date.split("T")[0] : "",
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

      toast.success("Frais enregistrés")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setSaving((prev) => ({ ...prev, [classId]: false }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frais de scolarité par classe</CardTitle>
        <CardDescription>
          Définissez le montant mensuel et la date limite pour chaque classe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {classes.map((cls) => {
            const isSaving = saving[cls.id] || false
            return (
              <div
                key={cls.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div className="w-32 shrink-0">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {cls.name}
                  </Badge>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Montant mensuel (FCFA)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 25000"
                      value={config[cls.id]?.amount || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [cls.id]: { ...prev[cls.id], amount: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Date limite
                    </label>
                    <Input
                      type="date"
                      value={config[cls.id]?.dueDate || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [cls.id]: { ...prev[cls.id], dueDate: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveFee(cls.id)}
                  disabled={isSaving || !config[cls.id]?.amount}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )
          })}
          {classes.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucune classe configurée.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
