import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, BookOpen, DollarSign, AlertCircle, TrendingUp, Share2, ExternalLink, UserPlus } from "lucide-react";
import { CopySchoolUrl } from "@/components/dashboard/copy-school-url";
import { AIInsights } from "@/components/dashboard/ai-insights";
import { formatCurrency } from "@/lib/utils/format-currency";

export default async function AdminDashboard({ params }: { params: Promise<{ ecole: string }> }) {
  const supabaseAdmin = createAdminClient();
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) {
    redirect(auth ? `/${slug}/teacher` : `/${slug}/login`);
  }

  const schoolId = auth.schoolId;

  // School name from DB
  const { data: schoolInfo } = await supabaseAdmin
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .single();
  const schoolName = schoolInfo?.name || "École";
  const headersList = await headers();

  // Récupérer statistiques (admin client pour bypass RLS)
  const [students, teachers, classes, payments, academicYears, subjects] = await Promise.all([
    supabaseAdmin.from("students").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("teachers").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("classes").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("payments").select("amount").eq("school_id", schoolId),
    supabaseAdmin.from("academic_years").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("subjects").select("id", { count: "exact" }).eq("school_id", schoolId),
  ]);

  const totalRevenue = (payments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const hasAcademicYear = (academicYears.count || 0) > 0;
  const hasClasses = (classes.count || 0) > 0;
  const hasSubjects = (subjects.count || 0) > 0;
  const hasTeachers = (teachers.count || 0) > 0;
  const allDone = hasAcademicYear && hasClasses && hasSubjects && hasTeachers;

  // URL de l'école via le slug
  const host = headersList.get("host") || "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const schoolUrl = `${protocol}://${host}/${slug}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">{schoolName}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${slug}/admin/school`}>Paramètres</Link>
        </Button>
      </div>

      {/* Stats Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Élèves</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{students.count || 0}</div>
            <p className="text-[11px] text-muted-foreground">Inscrits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Enseignants</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{teachers.count || 0}</div>
            <p className="text-[11px] text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Classes</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{classes.count || 0}</div>
            <p className="text-[11px] text-muted-foreground">Formées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">Revenus</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-xl md:text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding checklist */}
      {!allDone && (
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-primary shrink-0" />
              Configuration de votre école
            </CardTitle>
            <CardDescription>
              {!hasAcademicYear
                ? "Commencez par créer une année scolaire pour activer votre établissement."
                : "Bonne progression ! Continuez à configurer votre école."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-4 md:px-6">
            <SetupStep
              done={hasAcademicYear}
              label="Année scolaire"
              desc="Créez l'année en cours (3 trimestres auto-générés)"
              href={`/${slug}/admin/academic-years/new`}
              cta="Créer"
            />
            <SetupStep
              done={hasSubjects}
              label="Matières"
              desc="Ajoutez les matières enseignées (Maths, Français, etc.)"
              href={`/${slug}/admin/subjects/new`}
              cta="Ajouter"
            />
            <SetupStep
              done={hasClasses}
              label="Classes"
              desc="Créez les classes (6e, 5e, CM2, etc.)"
              href={`/${slug}/admin/classes/new`}
              cta="Créer"
              disabled={!hasAcademicYear}
            />
            <SetupStep
              done={hasTeachers}
              label="Enseignants"
              desc="Ajoutez le personnel enseignant"
              href={`/${slug}/admin/teachers/new`}
              cta="Ajouter"
            />
            <SetupStep
              done={hasTeachers && hasClasses && hasSubjects}
              label="Affectations"
              desc="Assignez les enseignants aux classes et matières"
              href={`/${slug}/admin/assignments/new`}
              cta="Affecter"
              disabled={!(hasTeachers && hasClasses && hasSubjects)}
            />
          </CardContent>
        </Card>
      )}

      {allDone && (
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              École configurée
            </CardTitle>
            <CardDescription>
              Votre établissement est prêt. Vous pouvez maintenant ajouter des élèves, des parents et gérer les présences.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions + AI */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base">Ajout rapide</CardTitle>
              <CardDescription>Personnel et élèves</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href={`/${slug}/admin/students/new`} className="block min-h-[44px]">
                  <Button className="w-full h-14 sm:h-20 flex flex-col gap-1 text-xs sm:text-sm" variant="outline">
                    <UserPlus className="h-5 w-5" />
                    Nouvel élève
                  </Button>
                </Link>
                <Link href={`/${slug}/admin/teachers/new`} className="block min-h-[44px]">
                  <Button className="w-full h-14 sm:h-20 flex flex-col gap-1 text-xs sm:text-sm" variant="outline">
                    <BookOpen className="h-5 w-5" />
                    Nouvel enseignant
                  </Button>
                </Link>
                <Link href={`/${slug}/admin/parents/new`} className="block min-h-[44px]">
                  <Button className="w-full h-14 sm:h-20 flex flex-col gap-1 text-xs sm:text-sm" variant="outline">
                    <Users className="h-5 w-5" />
                    Nouveau parent
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <AIInsights />
        </div>

        {/* Accès École */}
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-5 w-5 text-primary shrink-0" />
              Accès École
            </CardTitle>
            <CardDescription>Partagez ce lien</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div className="bg-white p-3 rounded-xl border inline-block mx-auto">
              <img
                src={`https://chart.googleapis.com/chart?cht=qr&chs=140x140&chl=${encodeURIComponent(schoolUrl)}`}
                alt="QR Code"
                className="mx-auto w-[120px] h-[120px] md:w-[140px] md:h-[140px]"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Lien direct :</p>
              <div className="p-2 bg-muted rounded border text-[11px] font-mono break-all leading-relaxed">
                {schoolUrl}
              </div>
              <div className="flex gap-2">
                <CopySchoolUrl url={schoolUrl} />
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-9" asChild>
                  <a href={schoolUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" /> Ouvrir
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SetupStep({
  done,
  label,
  desc,
  href,
  disabled,
  cta,
}: {
  done: boolean;
  label: string;
  desc: string;
  href: string;
  disabled?: boolean;
  cta: string;
}) {
  if (done) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
        <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-800">{label}</p>
          <p className="text-xs text-emerald-600">{desc}</p>
        </div>
        <span className="text-xs text-emerald-600 font-medium shrink-0">Fait</span>
      </div>
    );
  }

  return (
    <Link href={disabled ? "#" : href} className="block">
      <div className={`flex items-center justify-between gap-3 p-3 border rounded-lg transition-colors ${
        disabled
          ? "border-dashed border-muted-foreground/30 bg-muted/20 opacity-60 cursor-not-allowed"
          : "hover:bg-muted/50"
      }`}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Button size="sm" variant={disabled ? "ghost" : "default"} className="shrink-0" disabled={disabled}>
          {disabled ? "Attend..." : cta}
        </Button>
      </div>
    </Link>
  );
}
