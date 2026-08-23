import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { TrendingUp, Wallet, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import { formatCurrency } from "@/lib/utils/format-currency";
import { PaymentsExport, type PaymentExportRow } from "@/components/super-admin/payments-export";
import { PaymentsHistory, type PaymentHistoryRow } from "@/components/super-admin/payments-history";

export const dynamic = "force-dynamic";

export default async function SuperAdminPaymentsPage() {
  const supabaseAdmin = createAdminClient();

  const { decodeAuthCookie, getAuthCookieName } = await import("@/lib/utils/session-resolver");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const authCookieName = getAuthCookieName();
  const authCookie = cookieStore.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value ?? "");

  if (!session) redirect("/login");

  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!currentUser || currentUser.role !== "super_admin") redirect("/");

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select(`
      id, amount, status, payment_method, created_at, confirmed_at, school_id,
      school:school_id(name),
      student:student_id(matricule, user:user_id(first_name, last_name)),
      term:term_id(name)
    `)
    .order("created_at", { ascending: false });

  const all = payments ?? [];
  const confirmed = all.filter((p) => p.status === "confirmed");
  const pending = all.filter((p) => p.status === "pending");
  const rejected = all.filter((p) => p.status === "rejected");
  const totalRevenue = confirmed.reduce((s, p) => s + (p.amount ?? 0), 0);
  const pendingAmount = pending.reduce((s, p) => s + (p.amount ?? 0), 0);

  const bySchool = new Map<string, { name: string; total: number; count: number }>();
  for (const p of confirmed) {
    const schoolInfo = unwrapJoin(p.school) as { name: string } | null;
    const key = String(p.school_id ?? "unknown");
    const entry = bySchool.get(key) ?? { name: schoolInfo?.name ?? "—", total: 0, count: 0 };
    entry.total += p.amount ?? 0;
    entry.count += 1;
    bySchool.set(key, entry);
  }
  const schoolBreakdown = [...bySchool.entries()].sort((a, b) => b[1].total - a[1].total);

  const methodCount = all.reduce<Record<string, number>>((acc, p) => {
    if (p.status === "confirmed" && p.payment_method) {
      acc[p.payment_method] = (acc[p.payment_method] ?? 0) + 1;
    }
    return acc;
  }, {});

  const methodLabel: Record<string, string> = {
    cash: "Espèces",
    mobile_money: "Mobile Money",
    bank_transfer: "Virement",
    check: "Chèque",
  };

  const exportRows: PaymentExportRow[] = all.map((p: any) => {
    const schoolInfo = unwrapJoin(p.school) as { name: string } | null;
    const studentInfo = unwrapJoin(p.student) as {
      matricule: string;
      user: { first_name: string; last_name: string } | null;
    } | null;
    return {
      schoolName: schoolInfo?.name ?? null,
      studentName: studentInfo?.user
        ? `${studentInfo.user.last_name} ${studentInfo.user.first_name}`
        : null,
      matricule: studentInfo?.matricule ?? null,
      amount: p.amount ?? null,
      paymentMethod: p.payment_method ?? null,
      status: p.status ?? "unknown",
      createdAt: p.created_at ?? null,
    };
  });

  const historyRows: PaymentHistoryRow[] = all.map((p: any) => {
    const schoolInfo = unwrapJoin(p.school) as { name: string } | null;
    const studentInfo = unwrapJoin(p.student) as {
      matricule: string;
      user: { first_name: string; last_name: string } | null;
    } | null;
    return {
      id: p.id,
      schoolName: schoolInfo?.name ?? null,
      studentName: studentInfo?.user
        ? `${studentInfo.user.last_name} ${studentInfo.user.first_name}`
        : null,
      matricule: studentInfo?.matricule ?? null,
      amount: p.amount ?? null,
      paymentMethod: p.payment_method ?? null,
      status: p.status ?? "unknown",
      createdAt: p.created_at ?? null,
    };
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            Revenus — Toutes les écoles
          </h1>
          <p className="text-muted-foreground mt-1">Vue consolidée des paiements de la plateforme</p>
        </div>
        <PaymentsExport rows={exportRows} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Encaissé (confirmé)"
          value={formatCurrency(totalRevenue)}
          sub={`${confirmed.length} paiements`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          accent="emerald"
        />
        <KpiCard
          title="En attente"
          value={formatCurrency(pendingAmount)}
          sub={`${pending.length} déclarations à valider`}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          accent="amber"
        />
        <KpiCard
          title="Rejetés"
          value={rejected.length}
          sub={`${formatCurrency(rejected.reduce((s, p) => s + (p.amount ?? 0), 0))} annulés`}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          accent="red"
        />
        <KpiCard
          title="Total déclaré"
          value={formatCurrency(totalRevenue + pendingAmount)}
          sub={`${all.length} transactions`}
          icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
          accent="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Encaissé par école</CardTitle>
            <CardDescription>Paiements confirmés, classés par établissement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schoolBreakdown.length > 0 ? (
              schoolBreakdown.map(([schoolId, { name, total, count }]) => {
                const pct = totalRevenue > 0 ? Math.round((total / totalRevenue) * 100) : 0;
                return (
                  <Link key={schoolId} href={`/super-admin/schools/${schoolId}`} className="block hover:bg-muted/50 p-2 rounded-lg transition-colors">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate pr-2">{name}</span>
                      <span className="font-semibold shrink-0">{formatCurrency(total)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{count} paiements confirmés</p>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun paiement confirmé</p>
            )}
          </CardContent>
        </Card>

        {Object.keys(methodCount).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Méthodes de paiement</CardTitle>
              <CardDescription>Répartition des encaissements confirmés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(methodCount).map(([method, count]) => {
                const pct = confirmed.length > 0 ? Math.round((count / confirmed.length) * 100) : 0;
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{methodLabel[method] ?? method}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Commission Geschool — à brancher */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-3 text-sm text-muted-foreground">
          <span
            className="inline-flex p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"
            aria-hidden="true"
          >
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <span className="font-medium text-foreground">Commission Geschool par école affiliée</span>
            <span> — espace réservé pour le calcul de la part plateforme sur chaque encaissement (à brancher).</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des paiements</CardTitle>
          <CardDescription>
            Toutes les déclarations à travers les écoles — recherche, filtres et pagination.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <PaymentsHistory rows={historyRows} />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent: "indigo" | "emerald" | "amber" | "red";
}) {
  const bg: Record<string, string> = {
    indigo: "bg-indigo-50 dark:bg-indigo-950/30",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30",
    amber: "bg-amber-50 dark:bg-amber-950/30",
    red: "bg-red-50 dark:bg-red-950/30",
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-4">
        <div className={`inline-flex p-2 rounded-lg ${bg[accent]} mb-3`}>{icon}</div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}