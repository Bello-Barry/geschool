import { redirect } from "next/navigation";
import { TeacherForm } from "@/components/forms/teacher-form";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTeacherPage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${slug}/admin/teachers`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Ajouter un enseignant</h1>
      </div>

      <div className="max-w-2xl">
        <TeacherForm />
      </div>
    </div>
  );
}
