import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Récupérer les paiements récents
  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      student:student_id(
        matricule,
        user:user_id(first_name, last_name)
      ),
      academic_year:academic_year_id(name)
    `)
    .eq("school_id", schoolId)
    .order("payment_date", { ascending: false })
    .limit(10);

  // Calculer les statistiques
  const totalCollected = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion Financière</h1>
          <p className="text-gray-600 mt-1">Suivi des paiements et revenus</p>
        </div>
        <Link href="/admin/payments?action=new">
          <Button>Enregistrer paiement</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collecté ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCollected.toLocaleString()}₣</div>
            <p className="text-xs text-gray-600">Total des paiements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de recouvrement</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">75%</div>
            <p className="text-xs text-gray-600">Élèves à jour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arriérés</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 élèves</div>
            <p className="text-xs text-gray-600">En retard de paiement</p>
          </CardContent>
        </Card>
      </div>

      {/* Paiements récents */}
      <Card>
        <CardHeader>
          <CardTitle>Paiements récents</CardTitle>
          <CardDescription>10 derniers paiements enregistrés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Élève</th>
                  <th className="text-left py-3 px-4 font-semibold">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Méthode</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
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
                      <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                          {payment.payment_method === "cash" ? "Espèces" : payment.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">
                          Reçu
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      Aucun paiement enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/payments/arrears">
          <Button variant="outline" className="w-full">
            Voir les arriérés
          </Button>
        </Link>
        <Link href="/admin/payments/fees">
          <Button variant="outline" className="w-full">
            Gérer les frais
          </Button>
        </Link>
        <Link href="/admin/payments/reports">
          <Button variant="outline" className="w-full">
            Rapports financiers
          </Button>
        </Link>
      </div>
    </div>
  );
}
