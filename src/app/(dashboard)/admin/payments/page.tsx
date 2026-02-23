import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Receipt, Settings2, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { formatCFA, formatDate } from "@/lib/utils/formatters";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  // Récupérer les derniers paiements
  const { data: recentPayments } = await supabase
    .from("payments")
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(name)
      )
    `)
    .eq("school_id", schoolId)
    .order("payment_date", { ascending: false })
    .limit(10);

  // Calculer statistiques (simulé pour l'instant)
  const totalCollected = recentPayments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion Financière</h1>
          <p className="text-muted-foreground">Suivez les revenus et gérez les frais de scolarité.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/payments/fees">
              <Settings2 className="mr-2 h-4 w-4" />
              Paramétrer les frais
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/payments/new">
              <Plus className="mr-2 h-4 w-4" />
              Saisir un paiement
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collecté ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCFA(totalCollected)}</div>
            <p className="text-xs text-muted-foreground">+12% par rapport au mois dernier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de recouvrement</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">Objectif : 85% d'ici fin mars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arriérés totaux</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2M ₣</div>
            <p className="text-xs text-muted-foreground">15 élèves en retard de paiement</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières transactions</CardTitle>
          <CardDescription>
            Les 10 derniers paiements enregistrés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments?.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.student?.user?.first_name} {payment.student?.user?.last_name}
                  </TableCell>
                  <TableCell>{payment.student?.class?.name}</TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCFA(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Voir le reçu">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!recentPayments || recentPayments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucun paiement enregistré pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

