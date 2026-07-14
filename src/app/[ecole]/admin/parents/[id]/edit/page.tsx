import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { ParentForm } from "@/components/forms/parent-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditParentPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();

  const { data: parent } = await supabaseAdmin
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
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!parent) notFound();

  const userData = parent.user as unknown as { first_name: string; last_name: string; email: string; phone: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/parents/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier le parent</h1>
      </div>

      <div className="max-w-2xl">
        <ParentForm
          initialData={{
            id: parent.id,
            firstName: userData?.first_name || "",
            lastName: userData?.last_name || "",
            email: userData?.email || "",
            phone: userData?.phone || "",
            relationship: parent.relationship || "",
            profession: parent.profession || "",
          }}
        />
      </div>
    </div>
  );
}
