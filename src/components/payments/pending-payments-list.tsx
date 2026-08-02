"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatDate } from "@/lib/utils/formatters"
import { formatCurrency } from "@/lib/utils/format-currency"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ExitRow } from "@/components/ui/exit-row"

interface PendingPayment {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  reference_number: string | null
  notes: string | null
  status: string
  created_at: string
  student: {
    user: { first_name: string; last_name: string } | null
    class: { name: string } | null
  } | null
}

interface Props {
  initialPayments: PendingPayment[]
}

const methodLabels: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement",
  check: "Chèque",
}

export default function PendingPaymentsList({ initialPayments }: Props) {
  const [payments, setPayments] = useState(initialPayments)
  const [loading, setLoading] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleAction(id: string, action: "validate" | "reject") {
    setLoading(id)

    try {
      const res = await fetch(`/api/payments/${id}/${action}`, {
        method: "POST",
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur")
      }

      setRemoving(id)
      toast.success(action === "validate" ? "Paiement confirmé" : "Paiement rejeté")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(null)
    }
  }

  function handleRemoved(id: string) {
    setRemoving(null)
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Déclarations en attente</CardTitle>
          <CardDescription>
            Les déclarations de paiement des parents apparaîtront ici.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p>Aucune déclaration en attente</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Déclarations en attente ({payments.length})</CardTitle>
        <CardDescription>
          Validez uniquement après réception physique de l'argent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {payments.map((payment) => {
            const student = payment.student
            const userName = student?.user
              ? `${student.user.first_name} ${student.user.last_name}`
              : "Inconnu"
            const className = student?.class?.name || ""
            const method = methodLabels[payment.payment_method as string] || payment.payment_method || "N/A"

            return (
              <ExitRow
                key={payment.id}
                removing={removing === payment.id}
                onExited={() => handleRemoved(payment.id)}
              >
                <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1 flex-1">
                  <div className="font-medium">{userName}</div>
                  <div className="text-sm text-muted-foreground">
                    {className} • {method} • {formatDate(payment.payment_date)}
                  </div>
                  {payment.reference_number && (
                    <div className="text-xs text-muted-foreground">
                      Réf: {payment.reference_number}
                    </div>
                  )}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="font-bold text-lg">{formatCurrency(payment.amount)}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleAction(payment.id, "reject")}
                      disabled={loading === payment.id || removing === payment.id}
                    >
                      {loading === payment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Rejeter
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction(payment.id, "validate")}
                      disabled={loading === payment.id || removing === payment.id}
                    >
                      {loading === payment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Valider
                    </Button>
                  </div>
                </div>
                </div>
              </ExitRow>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
