import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/${slug}/teacher/grades`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Saisie des notes</h1>
                    <p className="text-muted-foreground">
                        {subjectData.data?.name} — {classData.data?.name} — {academicTerm.data?.name}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Liste des élèves</CardTitle>
                        <CardDescription>Saisissez les notes sur 20 pour chaque type d'évaluation.</CardDescription>
                    </div>
                    <Button className="flex gap-2">
                        <Save className="h-4 w-4" /> Sauvegarder tout
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">Élève</TableHead>
                                    <TableHead>Devoir</TableHead>
                                    <TableHead>Interro</TableHead>
                                    <TableHead>Compo</TableHead>
                                    <TableHead className="text-right">Moyenne</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.data?.map((student: any) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{student.user?.last_name} {student.user?.first_name}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{student.matricule}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" max="20" className="w-20" placeholder="—" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" max="20" className="w-20" placeholder="—" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" max="20" className="w-20" placeholder="—" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary">0.00</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" asChild>
                    <Link href={`/${slug}/teacher/grades`}>Annuler</Link>
                </Button>
                <Button className="w-32">
                    Sauvegarder
                </Button>
            </div>
        </div>
    );
}
