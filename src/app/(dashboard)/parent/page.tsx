import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3, FileText, MessageSquare, DollarSign } from "lucide-react";

export default async function ParentDashboard() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Vérifier le rôle
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (user?.role !== "parent") {
    redirect("/admin");
  }

  // Récupérer les enfants du parent
  const { data: children } = await supabase
    .from("student_parents")
    .select(`
      student:student_id(
        id,
        user:user_id(
          first_name,
          last_name
        ),
        class:class_id(name)
      )
    `)
    .eq("parent_id", 
      (await supabase
        .from("parents")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("school_id", schoolId)
        .single()).data?.id
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Espace Parent</h1>
        <p className="text-gray-600 mt-2">Suivi de la scolarité de vos enfants</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/parent/children">
          <Button className="w-full h-16">
            <div className="text-center">
              <BarChart3 className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Notes</span>
            </div>
          </Button>
        </Link>
        <Link href="/parent/payments">
          <Button className="w-full h-16" variant="outline">
            <div className="text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Paiements</span>
            </div>
          </Button>
        </Link>
        <Link href="/parent/messages">
          <Button className="w-full h-16" variant="outline">
            <div className="text-center">
              <MessageSquare className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Messages</span>
            </div>
          </Button>
        </Link>
        <Link href="/parent/chatbot">
          <Button className="w-full h-16" variant="outline">
            <div className="text-center">
              <FileText className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Aide IA</span>
            </div>
          </Button>
        </Link>
      </div>

      {/* Mes enfants */}
      <Card>
        <CardHeader>
          <CardTitle>Mes enfants</CardTitle>
          <CardDescription>Cliquez sur un enfant pour voir ses informations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children && children.length > 0 ? (
              children.map((item: any, i: number) => (
                <Link key={i} href={`/parent/children/${item.student.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow border">
                    <CardContent className="pt-6">
                      <p className="font-semibold text-lg">
                        {item.student.user?.first_name} {item.student.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{item.student.class?.name}</p>
                      <Button variant="sm" size="sm" className="mt-3 w-full">
                        Voir détails
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 col-span-full text-gray-500">
                Aucun enfant associé pour le moment
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertes */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-900">Informations importantes</CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-800 space-y-2">
          <p>• Consultez régulièrement les notes et présences de vos enfants</p>
          <p>• Mettez à jour vos informations de paiement si nécessaire</p>
          <p>• Utilisez l'assistant IA pour vos questions fréquentes</p>
        </CardContent>
      </Card>
    </div>
  );
}
