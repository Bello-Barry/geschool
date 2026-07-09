import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AssignmentForm } from "@/components/forms/assignment-form";

export default async function NewAssignmentPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const schoolId = auth.schoolId;

  const [teachersRes, subjectsRes, classesRes] = await Promise.all([
    supabaseAdmin
      .from("teachers")
      .select("id, user:user_id(first_name, last_name)")
      .eq("school_id", schoolId)
      .order("user_id"),
    supabaseAdmin
      .from("subjects")
      .select("id, name, code")
      .eq("school_id", schoolId)
      .order("name"),
    supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/admin/assignments`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Nouvelle affectation</h1>
      </div>
      <div className="max-w-2xl">
        <AssignmentForm
          teachers={(teachersRes.data || []).map((t: any) => ({
            id: t.id,
            user: Array.isArray(t.user) ? t.user[0] : t.user,
          }))}
          subjects={subjectsRes.data || []}
          classes={classesRes.data || []}
        />
      </div>
    </div>
  );
}
