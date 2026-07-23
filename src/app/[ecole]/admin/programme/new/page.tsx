import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProgrammeForm } from "@/components/forms/programme-form";

export default async function NewProgrammePage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  const [{ data: subjects }, { data: classes }, { data: terms }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("terms").select("id, name").eq("school_id", schoolId).order("term_number"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/admin/programme`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Nouvelle entrée</h1>
      </div>
      <div className="max-w-2xl">
        <ProgrammeForm subjects={subjects || []} classes={classes || []} terms={terms || []} />
      </div>
    </div>
  );
}
