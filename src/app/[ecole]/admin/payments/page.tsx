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
import { DollarSign, TrendingUp, Users, Receipt } from "lucide-react";
import Link from "next/link";
import { formatCFA, formatDate } from "@/lib/utils/formatters";
import TuitionFeesConfig from "@/components/payments/tuition-fees-config";
import PendingPaymentsList from "@/components/payments/pending-payments-list";

export default async function AdminPaymentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  // Get current academic year
  const { data: currentAY } = await supabaseAdmin
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  // Get all classes
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  // Get existing tuition fees for current year
  const { data: fees } = await supabaseAdmin
    .from("tuition_fees")
    .select(`
      *,
      class:class_id(id, name),
      academic_year:academic_year_id(id, name)
    `)
    .eq("school_id", schoolId)
    .eq("academic_year_id", currentAY?.id);

  // Get pending payments (declarations)
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

  // Get recent transactions (confirmed/rejected)
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

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmé</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion Financière</h1>
          <p className="text-muted-foreground">Frais de scolarité, déclarations et paiements.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collecté</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCFA(totalCollected)}</div>
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
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentPayments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Paiements traités</p>
          </CardContent>
        </Card>
      </div>

      {currentAY && classes && (
        <TuitionFeesConfig
          classes={classes}
          fees={fees || []}
          academicYearId={currentAY.id}
        />
      )}

      <PendingPaymentsList initialPayments={pendingPayments || []} />

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
                    {formatCFA(payment.amount)}
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
