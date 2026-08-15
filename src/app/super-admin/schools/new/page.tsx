import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SuperAdminSchoolForm } from "@/components/forms/super-admin-school-form";

export const metadata = {
  title: "Nouvelle École — Super Admin",
};

export default function NewSchoolPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit -ml-4 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/super-admin/schools">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Créer une Nouvelle École
          </h2>
          <p className="text-muted-foreground mt-1">
            Provisionnez un nouvel établissement et créez le compte de son directeur.
          </p>
        </div>
      </div>

      <SuperAdminSchoolForm />
    </div>
  );
}
