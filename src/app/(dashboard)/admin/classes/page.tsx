import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export default async function ClassesPage() {
  const supabase = await createClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Récupérer les classes
  const { data: classes } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      level,
      capacity,
      room_number,
      students(count)
    `)
    .eq("school_id", schoolId)
    .order("level, name");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des classes</h1>
          <p className="text-gray-600 mt-1">Organisez vos classes et sections</p>
        </div>
        <Link href="/admin/classes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle classe
          </Button>
        </Link>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes && classes.length > 0 ? (
          classes.map((cls: any) => (
            <Link key={cls.id} href={`/admin/classes/${cls.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{cls.name}</CardTitle>
                      <CardDescription>{cls.level}</CardDescription>
                    </div>
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Élèves</span>
                    <span className="font-semibold">
                      {cls.students?.[0]?.count || 0}/{cls.capacity || "-"}
                    </span>
                  </div>
                  {cls.room_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Salle</span>
                      <span className="font-semibold">{cls.room_number}</span>
                    </div>
                  )}
                  <Button className="w-full mt-4">Gérer</Button>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            Aucune classe créée pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
