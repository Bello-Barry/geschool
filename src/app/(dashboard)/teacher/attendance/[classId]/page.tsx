import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
import { Check, X, Clock, AlertCircle, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";

interface PageProps {
    params: Promise<{
        classId: string;
    }>;
}

export default async function AttendancePage({ params }: PageProps) {
    const { classId } = await params;
    const supabase = await createClient();
    const headersList = await headers();
    const schoolId = headersList.get("x-school-id");

    if (!schoolId) redirect("/login");

    // Charger les informations de la classe et des élèves
    const [classData, students] = await Promise.all([
        supabase.from("classes").select("name").eq("id", classId).single(),
        supabase.from("students").select(`
      id,
      matricule,
      user:user_id(first_name, last_name)
    `).eq("class_id", classId).order("user(last_name)", { ascending: true }),
    ]);

    const today = new Date();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/teacher/classes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Appel du jour</h1>
                    <p className="text-muted-foreground">
                        {classData.data?.name} — {formatDate(today)}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Registre de présence</CardTitle>
                        <CardDescription>Cochez le statut de chaque élève pour aujourd'hui.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">Cocher tous présents</Button>
                        <Button className="flex gap-2">
                            <Save className="h-4 w-4" /> Sauvegarder
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Élève</TableHead>
                                    <TableHead className="text-center">Statut</TableHead>
                                    <TableHead>Remarque / Justification</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.data?.map((student: any) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            {student.user?.last_name} {student.user?.first_name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 border-green-200 bg-green-50 shadow-none">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 border-red-200 shadow-none">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-yellow-600 border-yellow-200 shadow-none">
                                                    <Clock className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-blue-600 border-blue-200 shadow-none">
                                                    <AlertCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <input
                                                type="text"
                                                placeholder="Ajouter une note..."
                                                className="w-full bg-transparent border-none text-sm focus:ring-0"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
