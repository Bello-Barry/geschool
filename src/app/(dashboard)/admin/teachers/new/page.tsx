import { TeacherForm } from "@/components/forms/teacher-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTeacherPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/teachers">
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
