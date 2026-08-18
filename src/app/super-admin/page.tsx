import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  TrendingUp,
  Activity,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format-currency";
import { SchoolsTimeline, RevenueTimeline, UsersCumulative } from "@/components/super-admin/platform-overview-charts";

export const metadata = {
  title: "Super Admin — Geschool",
  description: "Tableau de bord global Geschool",
};

// Forcer le rendu dynamique (données en temps réel)
export const dynamic = "force-dynamic";

function buildMonthlyBuckets(months: number, now = new Date()) {
  const buckets: { key: string; label: string; start: Date; end: Date; schools: number; revenue: number; users: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      start,
      end,
      schools: 0,
      revenue: 0,
      users: 0,
    });
  }
  return buckets;
}

export default async function SuperAdminDashboard() {
  const supabaseAdmin = createAdminClient();

  // Vérifier que l'utilisateur est super_admin via le cookie de session
  const { decodeAuthCookie, getAuthCookieName } = await import("@/lib/utils/session-resolver");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const authCookieName = getAuthCookieName();
  const authCookie = cookieStore.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value ?? "");

  if (!session) redirect("/login");

  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("role, first_name, last_name")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!currentUser || currentUser.role !== "super_admin") {
    redirect("/");
  }

  // ─── Stats globales ───────────────────────────────────────────
  const [
    schoolsResult,
    usersResult,
    studentsResult,
    paymentsResult,
    recentSchoolsResult,
  ] = await Promise.all([
    supabaseAdmin.from("schools").select("id, name, subdomain, is_active, created_at, primary_color", { count: "exact" }),
    supabaseAdmin.from("users").select("id, role, created_at", { count: "exact" }),
    supabaseAdmin.from("students").select("school_id", { count: "exact" }),
    supabaseAdmin.from("payments").select("amount, status, created_at, school_id"),
    supabaseAdmin
      .from("schools")
      .select("id, name, subdomain, is_active, created_at, primary_color")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalSchools = schoolsResult.count ?? 0;
  const activeSchools = (schoolsResult.data ?? []).filter((s) => s.is_active).length;
  const inactiveSchools = totalSchools - activeSchools;
  const totalUsers = usersResult.count ?? 0;
  const totalStudents = studentsResult.count ?? 0;

  const allPayments = (paymentsResult.data ?? []).filter((p) => p.status === "confirmed");
  const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Revenus du mois en cours
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthRevenue = allPayments
    .filter((p) => p.created_at && p.created_at >= firstOfMonth)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Répartition des rôles
  const allUsers = usersResult.data ?? [];
  const roleCount = allUsers.reduce(
    (acc, u) => {
      const r = u.role as string;
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Écoles récentes
  const recentSchools = recentSchoolsResult.data ?? [];

  // ─── Séries temporelles (12 derniers mois) ────────────────────
  const buckets = buildMonthlyBuckets(12, now);
  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

  for (const s of schoolsResult.data ?? []) {
    if (s.created_at) {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = bucketByKey.get(key);
      if (b) b.schools++;
    }
  }
  for (const p of allPayments) {
    if (p.created_at) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = bucketByKey.get(key);
      if (b) b.revenue += p.amount ?? 0;
    }
  }
  let accUsers = 0;
  for (const b of buckets) {
    accUsers += allUsers.filter((u) => {
      if (!u.created_at) return false;
      const d = new Date(u.created_at);
      return d >= b.start && d < b.end;
    }).length;
    b.users = accUsers;
  }

  const schoolsSeries = buckets.map((b) => ({ label: b.label, schools: b.schools }));
  const revenueSeries = buckets.map((b) => ({ label: b.label, revenue: b.revenue }));
  const usersSeries = buckets.map((b) => ({ label: b.label, users: b.users }));

  // ─── Top revenus par école ─────────────────────────────────────
  const schoolNames = new Map((schoolsResult.data ?? []).map((s) => [s.id, s.name]));
  const revenueBySchool = new Map<string, { name: string; total: number; count: number }>();
  for (const p of allPayments) {
    const id = String(p.school_id ?? "unknown");
    const entry = revenueBySchool.get(id) ?? { name: schoolNames.get(id) ?? "—", total: 0, count: 0 };
    entry.total += p.amount ?? 0;
    entry.count += 1;
    revenueBySchool.set(id, entry);
  }
  const topRevenueSchools = [...revenueBySchool.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);
  const maxSchoolRevenue = topRevenueSchools[0]?.[1].total || 1;

  // ─── Écoles à risque ───────────────────────────────────────────
  const studentsBySchool = new Set((studentsResult.data ?? []).map((s: { school_id: string }) => s.school_id));
  const paidSchools = new Set(allPayments.map((p) => String(p.school_id)));

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const atRiskSchools = (schoolsResult.data ?? []).filter((s) => {
    if (s.is_active) return false;
    if (!studentsBySchool.has(s.id) && !paidSchools.has(s.id)) return true;
    if (s.created_at && new Date(s.created_at) > thirtyDaysAgo) return false;
    return !studentsBySchool.has(s.id);
  });

  // Ratio onboarding : écoles avec au moins 1 étudiant
  const onboardedSchools = studentsBySchool.size;
  const onboardingRate = totalSchools > 0 ? Math.round((onboardedSchools / totalSchools) * 100) : 0;

  return (
    <>
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Geschool — Super Admin</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bonjour, {currentUser.first_name} · Vue globale de la plateforme
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3 text-emerald-500" />
            Production
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Écoles clientes"
            value={totalSchools}
            sub={`${activeSchools} actives · ${inactiveSchools} inactives`}
            icon={<Building2 className="h-5 w-5 text-indigo-600" />}
            accent="indigo"
          />
          <KpiCard
            title="Utilisateurs totaux"
            value={totalUsers}
            sub={`${totalStudents} élèves inscrits`}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            accent="blue"
          />
          <KpiCard
            title="Revenus encaissés"
            value={formatCurrency(totalRevenue)}
            sub={`${formatCurrency(monthRevenue)} ce mois`}
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            accent="emerald"
          />
          <KpiCard
            title="Taux d'onboarding"
            value={`${onboardingRate}%`}
            sub={`${onboardedSchools}/${totalSchools} écoles avec élèves`}
            icon={<GraduationCap className="h-5 w-5 text-amber-600" />}
            accent="amber"
          />
        </div>

        {/* ── Séries temporelles ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Écoles créées par mois</CardTitle>
              <CardDescription>12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolsTimeline data={schoolsSeries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenus par mois</CardTitle>
              <CardDescription>Paiements confirmés, 12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueTimeline data={revenueSeries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilisateurs cumulés</CardTitle>
              <CardDescription>Total cumulé, 12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersCumulative data={usersSeries} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Top revenus par école ── */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top revenus par école</CardTitle>
                <CardDescription>Paiements confirmés, 5 premiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topRevenueSchools.length > 0 ? (
                  topRevenueSchools.map(([schoolId, { name, total, count }]) => {
                    const pct = Math.round((total / maxSchoolRevenue) * 100);
                    return (
                      <Link key={schoolId} href={`/super-admin/schools/${schoolId}`} className="block hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate pr-2">{name}</span>
                          <span className="font-semibold shrink-0">{formatCurrency(total)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{count} paiements confirmés</p>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun revenu confirmé</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Écoles à risque ── */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Écoles à risque
                </CardTitle>
                <CardDescription>Suspendues ou sans activité</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {atRiskSchools.length > 0 ? (
                  atRiskSchools.slice(0, 6).map((s) => (
                    <Link key={s.id} href={`/super-admin/schools/${s.id}`} className="block hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: s.primary_color ?? "#4F46E5" }}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground">/{s.subdomain}</p>
                        </div>
                        {!s.is_active ? (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune école à risque — tout va bien.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Panel droit ── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Répartition des rôles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition des rôles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "admin_school", label: "Directeurs / Admins", color: "bg-indigo-500" },
                  { key: "teacher", label: "Enseignants", color: "bg-blue-500" },
                  { key: "parent", label: "Parents", color: "bg-amber-500" },
                  { key: "student", label: "Élèves", color: "bg-emerald-500" },
                  { key: "super_admin", label: "Super Admins", color: "bg-red-500" },
                ].map(({ key, label, color }) => {
                  const count = roleCount[key] ?? 0;
                  const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 h-10" asChild>
                  <Link href="/super-admin/schools/new">
                    <Building2 className="h-4 w-4" />
                    Créer une nouvelle école
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 h-10" asChild>
                  <Link href="/super-admin/payments">
                    <TrendingUp className="h-4 w-4" />
                    Revenus plateforme
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Liste des écoles récentes ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Dernières écoles inscrites</CardTitle>
              <CardDescription>Les 10 plus récentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/super-admin/schools">Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentSchools.map((school) => (
                <Link key={school.id} href={`/super-admin/schools/${school.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: school.primary_color ?? "#4F46E5" }}
                    >
                      {school.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{school.name}</p>
                      <p className="text-xs text-muted-foreground">/{school.subdomain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {school.created_at ? new Date(school.created_at).toLocaleDateString("fr-FR") : "—"}
                    </span>
                    {school.is_active ? (
                      <Badge variant="secondary" className="gap-1 text-emerald-700 bg-emerald-50">
                        <CheckCircle2 className="h-3 w-3" />Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-red-600 bg-red-50">
                        <XCircle className="h-3 w-3" />Inactive
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
              {recentSchools.length === 0 && (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                  Aucune école inscrite pour le moment.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Composant KPI réutilisable ──────────────────────────────────
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
  accent: "indigo" | "blue" | "emerald" | "amber";
}) {
  const bg: Record<string, string> = {
    indigo: "bg-indigo-50 dark:bg-indigo-950/30",
    blue: "bg-blue-50 dark:bg-blue-950/30",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30",
    amber: "bg-amber-50 dark:bg-amber-950/30",
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-4 md:px-6">
        <div className={`inline-flex p-2 rounded-lg ${bg[accent]} mb-3`}>{icon}</div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}