import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { DollarSign, CreditCard, AlarmClock, TrendingUp, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format-currency";

export const dynamic = "force-dynamic";

export default async function AccountantDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "accountant") redirect(`/${slug}/login`);

  const supabaseAdministrative = createAdminClient();
  const schoolId = auth.schoolId;

  const todayISO = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [paymentsAll, monthPayments, unpaidDues, recentPayments] = await Promise.all([
    supabaseAdministrative.from("payments").select("amount").eq("school_id", schoolId),
    supabaseAdministrative
      .from("payments")
      .select("amount")
      .eq("school_id", schoolId)
      .gte("payment_date", monthStart)
      .eq("status", "confirmed"),
    supabaseAdministrative
      .from("monthly_dues")
      .select("id", { count: "exact" })
      .eq("school_id", schoolId)
      .eq("status", "unpaid")
      .lte("due_date", todayISO),
    supabaseAdministrative
      .from("payments")
      .select(`
        id,
        amount,
        status,
        payment_date,
        payment_method,
        reference_number,
        student:student_id(
          user:user_id(first_name, last_name),
          matricule
        )
      `)
      .eq("school_id", schoolId)
      .order("payment_date", { ascending: false })
      .limit(8),
  ]);

  const totalRevenue = (paymentsAll.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const monthRevenue = (monthPayments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const paymentsCount = paymentsAll.data?.length || 0;
  const duesCount = unpaidDues.count || 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Espace Comptable</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue financière de l&apos;établissement</p>
        </div>
        <Link
          href={`/${slug}/accountant/payments`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Receipt className="h-4 w-4" />
          Tous les paiements
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Revenus total</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-[11px] text-muted-foreground">encaissés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Revenus du mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{formatCurrency(monthRevenue)}</div>
            <p className="text-[11px] text-muted-foreground">confirmés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{paymentsCount}</div>
            <p className="text-[11px] text-muted-foreground">au total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Échéances impayées</CardTitle>
            <AlarmClock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{duesCount}</div>
            <p className="text-[11px] text-muted-foreground">à date</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-base">Derniers paiements</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {(recentPayments.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4 font-medium">Élève</th>
                    <th className="py-2 pr-4 font-medium">Matricule</th>
                    <th className="py-2 pr-4 font-medium">Montant</th>
                    <th className="py-2 pr-4 font-medium">Méthode</th>
                    <th className="py-2 pr-4 font-medium">Référence</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentPayments.data || []).map((payment: any) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {payment.student?.user?.first_name} {payment.student?.user?.last_name}
                      </td>
                      <td className="py-2 pr-4">{payment.student?.matricule || "—"}</td>
                      <td className="py-2 pr-4 font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="py-2 pr-4 capitalize">{payment.payment_method || "cash"}</td>
                      <td className="py-2 pr-4">{payment.reference_number || "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            payment.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700"
                              : payment.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {payment.status === "confirmed"
                            ? "Confirmé"
                            : payment.status === "rejected"
                              ? "Rejeté"
                              : "En attente"}
                        </span>
                      </td>
                      <td className="py-2">
                        {payment.payment_date
                          ? new Date(payment.payment_date + "T00:00:00").toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}