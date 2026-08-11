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
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format-currency";

export const metadata = {
  title: "Super Admin — Geschool",
  description: "Tableau de bord global Geschool",
};

// Forcer le rendu dynamique (données en temps réel)
export const dynamic = "force-dynamic";

export default async function SuperAdminDashboard() {
  // L'auth doit être super_admin — on vérifie via un slug quelconque
  // puisque ce tableau de bord est au niveau racine
  const supabaseAdmin = createAdminClient();

  // Vérifier que l'utilisateur est super_admin via le cookie de session
  // (la route /super-admin n'a pas de slug, on décode directement)
  // Import dynamique pour éviter les dépendances circulaires
  const { decodeAuthCookie, getAuthCookieName } = await import("@/lib/utils/session-resolver");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const authCookieName = getAuthCookieName();
  const authCookie = cookieStore.get(authCookieName);
  const session = decodeAuthCookie(authCookie?.value ?? "");

  if (!session) redirect("/login");

  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("role, school_id, first_name, last_name")
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
    supabaseAdmin.from("users").select("id, role", { count: "exact" }),
    supabaseAdmin.from("students").select("id", { count: "exact" }),
    supabaseAdmin.from("payments").select("amount, created_at"),
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

  const allPayments = paymentsResult.data ?? [];
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

  // Ratio onboarding : écoles avec au moins 1 étudiant
  const { data: schoolsWithStudents } = await supabaseAdmin
    .from("students")
    .select("school_id")
    .then(async (res) => {
      const uniqueSchoolIds = [...new Set((res.data ?? []).map((s: { school_id: string }) => s.school_id))];
      return { data: uniqueSchoolIds };
    });

  const onboardedSchools = schoolsWithStudents?.length ?? 0;
  const onboardingRate = totalSchools > 0 ? Math.round((onboardedSchools / totalSchools) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
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
            title="Revenus totaux"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Liste des écoles récentes ── */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Dernières écoles inscrites</CardTitle>
                  <CardDescription>Les 10 plus récentes</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/super-admin/schools">Tout voir</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentSchools.map((school) => (
                    <div key={school.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/${school.subdomain}/admin`} target="_blank">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
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

          {/* ── Panel droit ── */}
          <div className="space-y-6">
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
                  <Link href="/register">
                    <Building2 className="h-4 w-4" />
                    Créer une nouvelle école
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 h-10" asChild>
                  <Link href="/super-admin/schools">
                    <Globe className="h-4 w-4" />
                    Gérer toutes les écoles
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 h-10" asChild>
                  <Link href="/super-admin/users">
                    <Users className="h-4 w-4" />
                    Gérer les utilisateurs
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Statut plateforme */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Statut plateforme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "API Supabase", ok: true },
                  { label: "Email Resend", ok: !!process.env.RESEND_API_KEY },
                  { label: "IA Gemini", ok: !!process.env.GEMINI_API_KEY },
                  { label: "IA DeepSeek", ok: !!process.env.DEEPSEEK_API_KEY },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {ok ? "Actif" : "Non configuré"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
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
