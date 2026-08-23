import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format-currency";

export const dynamic = "force-dynamic";

export default async function AccountantPaymentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "accountant") redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: payments } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      status,
      payment_date,
      payment_method,
      reference_number,
      notes,
      student:student_id(
        user:user_id(first_name, last_name),
        matricule
      ),
      academic_year:academic_year_id(name)
    `)
    .eq("school_id", schoolId)
    .order("payment_date", { ascending: false });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Paiements</h1>
        <p className="text-sm text-muted-foreground mt-1">Consultation en lecture seule</p>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-base">
            {payments?.length || 0} paiement{(payments?.length || 0) > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {!payments || payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4 font-medium">Élève</th>
                    <th className="py-2 pr-4 font-medium">Matricule</th>
                    <th className="py-2 pr-4 font-medium">Année</th>
                    <th className="py-2 pr-4 font-medium">Montant</th>
                    <th className="py-2 pr-4 font-medium">Méthode</th>
                    <th className="py-2 pr-4 font-medium">Référence</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments || []).map((payment: any) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {payment.student?.user?.first_name} {payment.student?.user?.last_name}
                      </td>
                      <td className="py-2 pr-4">{payment.student?.matricule || "—"}</td>
                      <td className="py-2 pr-4">{payment.academic_year?.name || "—"}</td>
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