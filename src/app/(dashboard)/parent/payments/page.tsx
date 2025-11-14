import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DollarSign, AlertCircle } from "lucide-react";

export default async function ParentPaymentsPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Récupérer les enfants et leurs paiements
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("school_id", schoolId)
    .single();

  if (!parent) redirect("/parent");

  const { data: children } = await supabase
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id);

  const childrenIds = children?.map((c) => c.student_id) || [];

  // Récupérer les paiements
  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name)
      )
    `)
    .in("student_id", childrenIds)
    .order("payment_date", { ascending: false });

  const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const amountDue = 1500000 - totalPaid; // Exemple

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes paiements</h1>
        <p className="text-gray-600 mt-2">Suivi des frais de scolarité</p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payé</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid.toLocaleString()}₣</div>
            <p className="text-xs text-gray-600">Total payé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À payer</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(0, amountDue).toLocaleString()}₣</div>
            <p className="text-xs text-gray-600">Solde restant</p>
          </CardContent>
        </Card>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>Tous vos paiements enregistrés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Enfant</th>
                  <th className="text-left py-3 px-4 font-semibold">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {payments && payments.length > 0 ? (
                  payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {payment.student?.user?.first_name} {payment.student?.user?.last_name}
                      </td>
                      <td className="py-3 px-4 font-semibold">{payment.amount.toLocaleString()}₣</td>
                      <td className="py-3 px-4">
                        {new Date(payment.payment_date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="outline">
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Aucun paiement enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      {amountDue > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">Paiement dû</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800 mb-4">
              Vous devez encore {amountDue.toLocaleString()}₣ pour compléter le paiement.
            </p>
            <Button className="bg-yellow-600 hover:bg-yellow-700">Effectuer le paiement</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
