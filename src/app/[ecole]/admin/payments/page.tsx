import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { DollarSign, TrendingUp, Receipt, Settings2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";
import { formatCurrency } from "@/lib/utils/format-currency";
import PendingPaymentsList from "@/components/payments/pending-payments-list";
import { ensureMonthlyDuesForStudents } from "@/lib/utils/monthly-dues";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminPaymentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: pendingPayments } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(name)
      )
    `)
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: recentPayments } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(name)
      )
    `)
    .eq("school_id", schoolId)
    .neq("status", "pending")
    .order("payment_date", { ascending: false })
    .limit(20);

  const totalCollected = recentPayments?.reduce((sum: number, p: any) => sum + (p.status === "confirmed" ? p.amount : 0), 0) || 0;

  // Current academic year + generate monthly dues on demand
  const { data: currentAY } = await supabaseAdmin
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  const { data: allStudents } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("school_id", schoolId);

  const allStudentIds = (allStudents || []).map((s) => s.id);
  if (currentAY && allStudentIds.length > 0) {
    await ensureMonthlyDuesForStudents(allStudentIds);
  }

  const { data: monthlyDues } = await supabaseAdmin
    .from("monthly_dues")
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(name)
      )
    `)
    .eq("school_id", schoolId)
    .eq("academic_year_id", currentAY?.id || "00000000-0000-0000-0000-000000000000")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  const unpaidDues = (monthlyDues || []).filter((d: any) => d.status === "unpaid");
  const unpaidTotal = unpaidDues.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <StatusBadge status="confirmed" />;
      case "rejected":
        return <StatusBadge variant="danger">Rejeté</StatusBadge>;
      default:
        return <StatusBadge status="pending" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion Financière"
        description="Suivez les paiements et validez les déclarations."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/${slug}/admin/payments/fees`}>
              <Settings2 className="mr-2 h-4 w-4" />
              Configurer les frais de scolarité
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collecté</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground">Paiements confirmés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Déclarations à valider</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentPayments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Paiements traités</p>
          </CardContent>
        </Card>
      </div>

      <PendingPaymentsList initialPayments={pendingPayments || []} />

      {/* Monthly dues overview */}
      <Card>
        <CardHeader>
          <CardTitle>Échéances mensuelles</CardTitle>
          <CardDescription>
            {unpaidDues.length > 0
              ? `${unpaidDues.length} échéance(s) non réglée(s) — ${formatCurrency(unpaidTotal)} attendu`
              : "Toutes les échéances du mois sont réglées."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Élève</th>
                  <th className="text-left py-3 px-4 font-semibold">Classe</th>
                  <th className="text-left py-3 px-4 font-semibold">Période</th>
                  <th className="text-right py-3 px-4 font-semibold">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(monthlyDues || []).map((due: any) => (
                  <tr key={due.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {due.student?.user?.first_name} {due.student?.user?.last_name}
                    </td>
                    <td className="py-3 px-4">{due.student?.class?.name || "N/A"}</td>
                    <td className="py-3 px-4 capitalize">
                      {new Date(due.period_year, due.period_month - 1, 1).toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(due.amount)}</td>
                    <td className="py-3 px-4">
                      {due.status === "paid" ? (
                        <StatusBadge status="paid" />
                      ) : (
                        <StatusBadge status="pending" label="Non réglée" />
                      )}
                    </td>
                  </tr>
                ))}
                {(!monthlyDues || monthlyDues.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      Aucune échéance générée. Configurez les frais de scolarité pour commencer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
          <CardDescription>
            Paiements confirmés et rejetés.
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
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
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
                  <TableCell>{statusBadge(payment.status)}</TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "confirmed" && payment.receipt_pdf_url && (
                      <Button variant="ghost" size="icon" asChild title="Télécharger le reçu">
                        <Link href={`/api/payments/${payment.id}/receipt`}>
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!recentPayments || recentPayments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Aucun paiement traité pour le moment.
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
