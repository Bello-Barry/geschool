"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, HandCoins } from "lucide-react"
import { toast } from "sonner"

interface Student {
  id: string
  user: { first_name: string; last_name: string } | null
  class: { id: string; name: string } | null
}

interface Props {
  students: Student[]
  slug: string
}

const paymentMethods = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "check", label: "Chèque" },
]

export default function DeclarePaymentForm({ students }: Props) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [reference, setReference] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!studentId || !amount || !method) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    setSaving(true)

    try {
      const res = await fetch("/api/payments/declare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          amount: Number(amount),
          payment_method: method,
          reference_number: reference || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(typeof err.error === "string" ? err.error : "Erreur lors de la déclaration")
      }

      toast.success("Paiement déclaré avec succès ! En attente de validation par l'administration.")
      setOpen(false)
      setStudentId("")
      setAmount("")
      setMethod("cash")
      setReference("")
      // Reload to show the new payment
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button
            className="w-full py-6 text-lg"
            onClick={() => setOpen(true)}
          >
            <HandCoins className="mr-2 h-5 w-5" />
            J'ai payé — Déclarer un paiement
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle>Déclarer un paiement</CardTitle>
        <CardDescription>
          Vous avez effectué un paiement ? Déclarez-le ici. L&apos;administration le validera après
          réception physique des fonds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Enfant concerné *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un enfant" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.user?.first_name} {s.user?.last_name} — {s.class?.name || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant (FCFA) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="Ex: 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Mode de paiement *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Référence (optionnelle)</Label>
            <Input
              id="reference"
              placeholder="Numéro de transaction, reçu, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Déclarer le paiement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
