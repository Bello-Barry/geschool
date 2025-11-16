import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, BookOpen, DollarSign, AlertCircle, TrendingUp } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Admin</h1>
        <p className="text-gray-600 mt-2">Bienvenue dans l'interface de gestion de votre école</p>
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/students/new">
            <Button className="w-full">Ajouter un élève</Button>
          </Link>
          <Link href="/admin/teachers/new">
            <Button className="w-full" variant="outline">Ajouter enseignant</Button>
          </Link>
          <Link href="/admin/classes/new">
            <Button className="w-full" variant="outline">Créer classe</Button>
          </Link>
          <Link href="/admin/payments">
            <Button className="w-full" variant="outline">Voir paiements</Button>
          </Link>
        </div>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Alertes importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">• Configurez l'année scolaire courante</p>
          <p className="text-sm text-gray-700">• Vérifiez les frais de scolarité pour cette année</p>
          <p className="text-sm text-gray-700">• Importez la liste des élèves depuis CSV</p>
        </CardContent>
      </Card>
    </div>
  );
}
