import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SubjectForm } from "@/components/forms/subject-form";

export default async function EditSubjectPage({ params }: { params: Promise<{ ecole: string; id: string }> }) {
  const { ecole, id } = await params;
  const auth = await getAuthUser(ecole);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${ecole}/login`);

  const supabaseAdmin = createAdminClient();
  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("*")
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .single();

  if (!subject) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${ecole}/admin/subjects`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Modifier la matière</h1>
      </div>
      <div className="max-w-2xl">
        <SubjectForm
          initialData={{
            id: subject.id,
            name: subject.name,
            code: subject.code,
            coefficient: subject.coefficient,
            description: subject.description,
          }}
        />
      </div>
    </div>
  );
}
