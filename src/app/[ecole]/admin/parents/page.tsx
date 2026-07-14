import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ParentsPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parents } = await supabaseAdmin
    .from("parents")
    .select(`
      id,
      relationship,
      profession,
      user:user_id(
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("school_id", auth.schoolId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des parents</h1>
          <p className="text-gray-600 mt-1">Gérez les parents et tuteurs</p>
        </div>
        <Link href={`/${slug}/admin/parents/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau parent
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parents ({parents?.length || 0})</CardTitle>
          <CardDescription>Tous les parents inscrits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Nom</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Téléphone</th>
                  <th className="text-left py-3 px-4 font-semibold">Lien de parenté</th>
                  <th className="text-left py-3 px-4 font-semibold">Profession</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parents && parents.length > 0 ? (
                  parents.map((parent: any) => {
                    const userData = parent.user as unknown as { first_name: string; last_name: string; email: string; phone: string } | null;
                    return (
                      <tr key={parent.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          {userData?.first_name} {userData?.last_name}
                        </td>
                        <td className="py-3 px-4">{userData?.email}</td>
                        <td className="py-3 px-4">{userData?.phone || "-"}</td>
                        <td className="py-3 px-4">{parent.relationship || "-"}</td>
                        <td className="py-3 px-4">{parent.profession || "-"}</td>
                        <td className="py-3 px-4">
                          <Link href={`/${slug}/admin/parents/${parent.id}`}>
                            <Button variant="outline" size="sm">
                              Voir
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      Aucun parent inscrit pour le moment
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
