import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function ParentChildrenPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();

  // Récupérer les enfants du parent
  const { data: parent } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) redirect("/parent");

  const { data: children } = await supabaseAdmin
    .from("student_parents")
    .select(`
      student:student_id(
        id,
        matricule,
        user:user_id(
          first_name,
          last_name
        ),
        class:class_id(name),
        students_avg:grades(count)
      )
    `)
    .eq("parent_id", parent.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes enfants</h1>
        <p className="text-gray-600 mt-2">Consultez les informations de vos enfants</p>
      </div>

      {/* Enfants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children && children.length > 0 ? (
          children.map((item: any) => (
            <Link key={item.student.id} href={`/${slug}/parent/children/${item.student.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>
                    {item.student.user?.first_name} {item.student.user?.last_name}
                  </CardTitle>
                  <CardDescription>{item.student.class?.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Matricule</span>
                    <span className="font-mono text-sm">{item.student.matricule}</span>
                  </div>
                  <div className="flex gap-2">
                      <Link href={`/${slug}/parent/children/${item.student.id}/grades`} className="flex-1">
                      <Button className="w-full" variant="outline" size="sm">
                        Notes
                      </Button>
                    </Link>
                    <Link
                      href={`/${slug}/parent/children/${item.student.id}/reports`}
                      className="flex-1"
                    >
                      <Button className="w-full" variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Bulletins
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="col-span-full text-center py-12">
            <p className="text-gray-500">Aucun enfant associé pour le moment</p>
          </Card>
        )}
      </div>
    </div>
  );
}
