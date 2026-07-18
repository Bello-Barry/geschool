import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { GradeEntryForm } from "@/components/forms/grade-entry-form";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
    params: Promise<{
        ecole: string;
        classId: string;
        subjectId: string;
    }>;
}

export default async function GradeEntryPage({ params }: PageProps) {
    const { ecole: slug, classId, subjectId } = await params;
    const auth = await getAuthUser(slug);
    if (!auth || auth.role !== "teacher") redirect(`/${slug}/login`);

    const supabaseAdmin = createAdminClient();

    const [classData, subjectData, students, academicTerm] = await Promise.all([
        supabaseAdmin.from("classes").select("name").eq("id", classId).single(),
        supabaseAdmin.from("subjects").select("name").eq("id", subjectId).single(),
        supabaseAdmin.from("students").select(`
      id,
      matricule,
      user:user_id(first_name, last_name)
    `).eq("class_id", classId).order("user(last_name)", { ascending: true }),
        supabaseAdmin.from("terms").select("id, name").eq("school_id", auth.schoolId).eq("is_current", true).single(),
    ]);

    const mappedStudents = (students.data ?? []).map((s: any) => ({
        id: s.id,
        matricule: s.matricule,
        user: Array.isArray(s.user) ? s.user[0] ?? null : s.user ?? null,
    }));

    if (!academicTerm.data?.id) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Saisie des notes</h1>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Aucune période scolaire active. Veuillez activer un trimestre dans les paramètres.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <GradeEntryForm
            students={mappedStudents}
            subjectId={subjectId}
            termId={academicTerm.data.id}
            subjectName={subjectData.data?.name ?? ""}
            className={classData.data?.name ?? ""}
            termName={academicTerm.data.name}
        />
    );
}
