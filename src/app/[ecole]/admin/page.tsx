import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, BookOpen, DollarSign, AlertCircle, TrendingUp, Share2, Copy, ExternalLink, UserPlus } from "lucide-react";
import { AIInsights } from "@/components/dashboard/ai-insights";

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
  const [students, teachers, classes, payments] = await Promise.all([
    supabaseAdmin.from("students").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("teachers").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("classes").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabaseAdmin.from("payments").select("amount").eq("school_id", schoolId),
  ]);

  const totalRevenue = (payments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

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
            <div className="text-xl md:text-2xl font-bold">{totalRevenue.toLocaleString()}₣</div>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions requises — AVANT les actions rapides (spec) */}
      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
            Actions requises
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 md:px-6">
          <Link href={`/${slug}/admin/academic-years/new`} className="block min-h-[44px]">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50/50 hover:bg-yellow-100/50 transition-colors">
              <p className="text-sm font-medium">Configuration année scolaire</p>
              <Button size="sm" variant="ghost" className="shrink-0">Créer</Button>
            </div>
          </Link>
          <Link href={`/${slug}/admin/classes/new`} className="block min-h-[44px]">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium">Créer une classe</p>
              <Button size="sm" variant="ghost" className="shrink-0">Créer</Button>
            </div>
          </Link>
          <Link href={`/${slug}/admin/assignments/new`} className="block min-h-[44px]">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium">Affecter un enseignant</p>
              <Button size="sm" variant="ghost" className="shrink-0">Affecter</Button>
            </div>
          </Link>
        </CardContent>
      </Card>

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
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-9">
                  <Copy className="h-3 w-3" /> Copier
                </Button>
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
