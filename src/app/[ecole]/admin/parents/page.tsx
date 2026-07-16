import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ParentsTable } from "@/components/ui/tables";
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
        phone,
        is_active
      )
    `)
    .eq("school_id", auth.schoolId)
    .order("created_at", { ascending: false });

  const parentsWithMeta = (parents ?? []).map((p: any) => ({
    ...p,
    is_active: p.user?.is_active ?? true,
  }));

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
          <ParentsTable data={parentsWithMeta} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
