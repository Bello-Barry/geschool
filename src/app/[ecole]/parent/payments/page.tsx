import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCFA, formatDate } from "@/lib/utils/formatters";
import DeclarePaymentForm from "@/components/payments/declare-payment-form";

export default async function ParentPaymentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) redirect(`/${slug}`);

  const { data: children } = await supabaseAdmin
    .from("student_parents")
    .select("student_id")
    .eq("parent_id", parent.id);

  const childrenIds = children?.map((c) => c.student_id) || [];

  // Get children details
  const { data: students } = await supabaseAdmin
    .from("students")
    .select(`
      id,
      user:user_id(first_name, last_name),
      class:class_id(id, name)
    `)
    .in("id", childrenIds);

  // Get current academic year
  const { data: currentAY } = await supabaseAdmin
    .from("academic_years")
    .select("id, name")
    .eq("school_id", auth.schoolId)
    .eq("is_current", true)
    .maybeSingle();

  // Get tuition fees for each child's class
  let feeByClass: Record<string, { amount: number; due_date: string | null }> = {};
  if (currentAY && students) {
    const classIds = students.map((s: any) => s.class?.id).filter(Boolean);
    if (classIds.length > 0) {
      const { data: fees } = await supabaseAdmin
        .from("tuition_fees")
        .select("class_id, amount, due_date")
        .eq("school_id", auth.schoolId)
        .eq("academic_year_id", currentAY.id)
        .in("class_id", classIds);

      for (const fee of fees || []) {
        if (fee.class_id) feeByClass[fee.class_id] = { amount: fee.amount, due_date: fee.due_date };
      }
    }
  }

  // Get payments for children
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select(`
      *,
      student:student_id(
        user:user_id(first_name, last_name),
        class:class_id(name)
      )
    `)
    .in("student_id", childrenIds)
    .order("created_at", { ascending: false });

  const totalPaid = (payments || [])
    .filter((p: any) => p.status === "confirmed")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const totalPending = (payments || [])
    .filter((p: any) => p.status === "pending")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Calculate total due from fees
  let totalDue = 0;
  if (students) {
    for (const s of students as any[]) {
      const fee = s.class?.id ? feeByClass[s.class.id] : undefined;
      if (fee) {
        totalDue += fee.amount;
      }
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmé</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes paiements</h1>
        <p className="text-gray-600 mt-2">Suivi des frais de scolarité</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payé</CardTitle>
            <span className="text-green-600 font-bold">{formatCFA(totalPaid)}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCFA(totalPaid)}</div>
            <p className="text-xs text-gray-600">Total confirmé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <span className="text-blue-600 font-bold">{formatCFA(totalPending)}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCFA(totalPending)}</div>
            <p className="text-xs text-gray-600">En cours de validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dû</CardTitle>
            <span className="text-red-600 font-bold">{formatCFA(Math.max(0, totalDue - totalPaid))}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCFA(Math.max(0, totalDue - totalPaid))}</div>
            <p className="text-xs text-gray-600">Solde restant</p>
          </CardContent>
        </Card>
      </div>

      {/* Fee info per child */}
      {students && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frais de scolarité</CardTitle>
            <CardDescription>Montants dus pour l&apos;année en cours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(students as any[]).map((student) => {
                const fee = student.class?.id ? feeByClass[student.class.id] : null;
                const userName = student.user
                  ? `${student.user.first_name} ${student.user.last_name}`
                  : "Inconnu";
                return (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="font-medium">{userName}</div>
                      <div className="text-sm text-muted-foreground">{student.class?.name || "N/A"}</div>
                    </div>
                    <div className="text-right">
                      {fee ? (
                        <>
                          <div className="font-bold">{formatCFA(fee.amount)}</div>
                          {fee.due_date && (
                            <div className="text-xs text-muted-foreground">
                              Date limite: {formatDate(fee.due_date)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">Non configuré</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Declare payment */}
      {students && students.length > 0 && (
        <DeclarePaymentForm students={students as any[]} slug={slug} />
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>Toutes vos déclarations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Enfant</th>
                  <th className="text-left py-3 px-4 font-semibold">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Mode</th>
                  <th className="text-left py-3 px-4 font-semibold">Statut</th>
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
                      <td className="py-3 px-4 font-semibold">{formatCFA(payment.amount)}</td>
                      <td className="py-3 px-4">{formatDate(payment.payment_date)}</td>
                      <td className="py-3 px-4">{payment.payment_method || "-"}</td>
                      <td className="py-3 px-4">{statusBadge(payment.status)}</td>
                      <td className="py-3 px-4">
                        {payment.status === "confirmed" && payment.receipt_pdf_url ? (
                          <a
                            href={`/api/payments/${payment.id}/receipt`}
                            className="text-blue-600 hover:underline text-sm"
                            download
                          >
                            Télécharger
                          </a>
                        ) : payment.status === "confirmed" ? (
                          <span className="text-muted-foreground text-xs">Bientôt disponible</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      Aucun paiement enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
