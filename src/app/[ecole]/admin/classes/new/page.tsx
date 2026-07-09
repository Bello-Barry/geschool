import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClassForm } from "@/components/forms/class-form";

export default async function NewClassPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabaseAdmin = createAdminClient();
  const { data: academicYears } = await supabaseAdmin
    .from("academic_years")
    .select("id, name, is_current")
    .eq("school_id", auth.schoolId)
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/admin/classes`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Ajouter une classe</h1>
      </div>
      <div className="max-w-2xl">
        <ClassForm academicYears={academicYears || []} />
      </div>
    </div>
  );
}
