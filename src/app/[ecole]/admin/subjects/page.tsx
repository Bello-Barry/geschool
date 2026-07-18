import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectsTable } from "@/components/ui/tables";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function SubjectsPage({ params }: { params: Promise<{ ecole: string }> }) {
    const slug = (await params).ecole;
    const auth = await getAuthUser(slug);
    if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

    const supabaseAdmin = createAdminClient();
    const schoolId = auth.schoolId;

    const { data: subjects } = await supabaseAdmin
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Matières</h1>
                    <p className="text-muted-foreground">Gérez les matières enseignées et leurs coefficients.</p>
                </div>
                <Button asChild>
                    <Link href={`/${slug}/admin/subjects/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle matière
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des matières</CardTitle>
                    <CardDescription>
                        Toutes les matières enregistrées pour votre établissement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SubjectsTable data={subjects || []} slug={slug} />
                </CardContent>
            </Card>
        </div>
    );
}
