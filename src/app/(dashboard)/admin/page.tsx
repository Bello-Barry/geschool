import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, BookOpen, DollarSign, AlertCircle, TrendingUp, Share2, Copy, ExternalLink, UserPlus } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");
  const schoolName = headersList.get("x-school-name");
  const subdomain = headersList.get("x-school-subdomain");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Récupérer l'utilisateur et vérifier le rôle
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "admin_school" && user?.role !== "super_admin") {
    redirect("/teacher");
  }

  // Récupérer statistiques
  const [students, teachers, classes, payments] = await Promise.all([
    supabase.from("students").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabase.from("teachers").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabase.from("classes").select("id", { count: "exact" }).eq("school_id", schoolId),
    supabase.from("payments").select("amount").eq("school_id", schoolId),
  ]);

  const totalRevenue = (payments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  // URL de l'école
  const host = headersList.get("host") || "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const schoolUrl = `${protocol}://${host}`;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord {schoolName}</h1>
          <p className="text-gray-600 mt-2">Bienvenue dans l'interface de gestion de votre école</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/school`}>
              Paramètres école
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Élèves</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.count || 0}</div>
            <p className="text-xs text-gray-600">Inscrits cette année</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enseignants</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.count || 0}</div>
            <p className="text-xs text-gray-600">Actuellement actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.count || 0}</div>
            <p className="text-xs text-gray-600">Formées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}₣</div>
            <p className="text-xs text-gray-600">Total collecté</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion du personnel et des élèves</CardTitle>
              <CardDescription>Ajoutez rapidement de nouveaux membres à votre établissement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/students/new" className="block">
                  <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                    <UserPlus className="h-6 w-6" />
                    Nouvel élève
                  </Button>
                </Link>
                <Link href="/admin/teachers/new" className="block">
                  <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                    <BookOpen className="h-6 w-6" />
                    Nouvel enseignant
                  </Button>
                </Link>
                <Link href="/admin/parents/new" className="block">
                  <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                    <Users className="h-6 w-6" />
                    Nouveau parent
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Actions requises
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50/50">
                <p className="text-sm font-medium">Configuration de l'année scolaire</p>
                <Button size="sm" variant="ghost">Gérer</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <p className="text-sm font-medium">Définition des frais de scolarité</p>
                <Button size="sm" variant="ghost">Gérer</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <p className="text-sm font-medium">Importation massive d'élèves (CSV)</p>
                <Button size="sm" variant="ghost">Importer</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Access & Sharing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Accès École
              </CardTitle>
              <CardDescription>Partagez ce lien avec votre personnel et les parents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="bg-white p-4 rounded-xl border inline-block mx-auto">
                <img
                  src={`https://chart.googleapis.com/chart?cht=qr&chs=180x180&chl=${encodeURIComponent(schoolUrl)}`}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>

              <div className="space-y-2 text-left">
                <p className="text-sm font-medium">Lien direct :</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded border text-xs font-mono break-all">
                  {schoolUrl}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-full flex gap-2">
                    <Copy className="h-3 w-3" /> Copier
                  </Button>
                  <Button variant="outline" size="sm" className="w-full flex gap-2" asChild>
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
    </div>
  );
}
