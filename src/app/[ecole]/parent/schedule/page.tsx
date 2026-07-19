import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ParentSchedulePage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || auth.role !== "parent") redirect(`/${slug}/login`);

  const supabase = createAdminClient();

  const { data: parentRecord } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parentRecord) redirect(`/${slug}/parent`);

  const { data: children } = await supabase
    .from("student_parents")
    .select(`
      student:student_id(id, user:user_id(first_name, last_name), class:class_id(name))
    `)
    .eq("parent_id", parentRecord.id);

  if (!children || children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Emploi du temps</h1>
        <p className="text-muted-foreground">Aucun enfant lié à votre compte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Emploi du temps</h1>
      <p className="text-muted-foreground">Sélectionnez un enfant pour voir son emploi du temps.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {children.map((sp: any) => {
          const student = sp.student;
          const name = student?.user
            ? `${student.user.first_name || ""} ${student.user.last_name || ""}`
            : "Élève inconnu";
          return (
            <Link key={student?.id || ""} href={`/${slug}/parent/children/${student?.id}/schedule`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Classe: {student?.class?.name || "—"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
