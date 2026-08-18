import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Users, GraduationCap, UserCog, CreditCard, CalendarRange, Globe, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchoolActions } from "@/components/super-admin/school-actions";

export const dynamic = "force-dynamic";

function KpiCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabaseAdmin = createAdminClient();

  const [
    { data: school },
    { count: totalUsers },
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalParents },
    { count: totalClasses },
    { data: payments },
    { data: adminUser },
  ] = await Promise.all([
    supabaseAdmin
      .from("schools")
      .select("id, name, subdomain, is_active, created_at, primary_color, code, logo_url")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("school_id", id),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("school_id", id).eq("role", "student"),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("school_id", id).eq("role", "teacher"),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("school_id", id).eq("role", "parent"),
    supabaseAdmin.from("classes").select("*", { count: "exact", head: true }).eq("school_id", id),
    supabaseAdmin
      .from("payments")
      .select("amount, status, created_at")
      .eq("school_id", id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("users")
      .select("first_name, last_name, email, created_at")
      .eq("school_id", id)
      .eq("role", "admin_school")
      .maybeSingle(),
  ]);

  if (!school) notFound();

  const totalRevenue = (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const formatCurrency = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 });

  // Étapes d'onboarding franchies
  const onboardingSteps = [
    { label: "Compte école créé", done: true },
    { label: "Directeur / admin rattaché", done: !!adminUser },
    { label: "Année scolaire configurée", done: null as boolean | null },
    { label: "Classes créées", done: (totalClasses ?? 0) > 0 },
    { label: "Élèves inscrits", done: (totalStudents ?? 0) > 0 },
    { label: "Premier paiement", done: (payments ?? []).length > 0 },
  ];
  // Contrôler la présence d'au moins une année scolaire
  const { count: totalYears } = await supabaseAdmin
    .from("academic_years")
    .select("*", { count: "exact", head: true })
    .eq("school_id", id);
  onboardingSteps[2]!.done = (totalYears ?? 0) > 0;
  const onboardingDone = onboardingSteps.filter((s) => s.done).length;
  const onboardingRate = Math.round((onboardingDone / onboardingSteps.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit -ml-4 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/super-admin/schools">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0"
              style={{ background: school.primary_color ?? "#4F46E5" }}
            >
              {school.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{school.name}</h1>
                {school.is_active ? (
                  <Badge className="gap-1 text-emerald-700 bg-emerald-50 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />Active
                  </Badge>
                ) : (
                  <Badge className="gap-1 text-red-600 bg-red-50 border-red-200">
                    <XCircle className="h-3 w-3" />Suspendue
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                <Globe className="h-3.5 w-3.5" />
                <span className="font-mono">{school.subdomain}.geschool.com</span>
                <span>·</span>
                <Clock className="h-3.5 w-3.5" />
                <span>Inscrit le {new Date(school.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          <SchoolActions
            schoolId={school.id}
            schoolName={school.name}
            isActive={school.is_active ?? false}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Utilisateurs" value={totalUsers ?? 0} icon={<Users className="h-5 w-5 text-blue-600" />} color="bg-blue-50" />
        <KpiCard title="Élèves" value={totalStudents ?? 0} icon={<GraduationCap className="h-5 w-5 text-indigo-600" />} color="bg-indigo-50" />
        <KpiCard title="Enseignants" value={totalTeachers ?? 0} icon={<Users className="h-5 w-5 text-purple-600" />} color="bg-purple-50" />
        <KpiCard title="Parents" value={totalParents ?? 0} icon={<UserCog className="h-5 w-5 text-amber-600" />} color="bg-amber-50" />
        <KpiCard title="Classes" value={totalClasses ?? 0} icon={<Users className="h-5 w-5 text-teal-600" />} color="bg-teal-50" />
        <KpiCard title="Revenus confirmés" value={formatCurrency(totalRevenue)} icon={<CreditCard className="h-5 w-5 text-emerald-600" />} color="bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Directeur / Admin principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {adminUser.first_name?.charAt(0) ?? "?"}
                  </div>
                  <div>
                    <p className="font-semibold">{adminUser.first_name} {adminUser.last_name}</p>
                    <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Compte créé le {new Date(adminUser.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucun administrateur trouvé.</p>
            )}
          </CardContent>
        </Card>

        {/* School Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Informations techniques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID école</span>
              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{school.id.substring(0, 16)}...</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span className="font-medium">{school.code ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-domaine</span>
              <span className="font-medium font-mono">{school.subdomain}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Couleur principale</span>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border" style={{ background: school.primary_color ?? "#4F46E5" }} />
                <span className="font-mono text-xs">{school.primary_color ?? "#4F46E5"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Derniers paiements confirmés
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(payments ?? []).length > 0 ? (
              <div className="divide-y">
                {(payments ?? []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-8 text-center text-muted-foreground text-sm">Aucun paiement confirmé pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statut d'onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Statut d'onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${onboardingRate}%` }}
              />
            </div>
            <span className="text-sm font-semibold whitespace-nowrap">{onboardingRate}%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {onboardingSteps.map((step) => (
              <div
                key={step.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  step.done ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
