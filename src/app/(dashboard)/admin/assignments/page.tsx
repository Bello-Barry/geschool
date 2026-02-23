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
import { Badge } from "@/components/ui/badge";
import { UserCog, Plus, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default async function AssignmentsPage() {
    const supabase = await createClient();
    const headersList = await headers();
    const schoolId = headersList.get("x-school-id");

    if (!schoolId) redirect("/login");

    // Charger les affectations (Enseignants -> Matières -> Classes)
    const { data: assignments } = await supabase
        .from("teacher_subjects")
        .select(`
      id,
      teacher:teacher_id(
        id,
        user:user_id(first_name, last_name)
      ),
      subject:subject_id(name, code),
      class:class_id(name)
    `)
        .eq("school_id", schoolId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Affectations</h1>
                    <p className="text-muted-foreground">Associez les enseignants aux matières et aux classes.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/assignments/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle affectation
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Rechercher un enseignant ou une classe..." className="pl-9" />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Enseignant</TableHead>
                                <TableHead>Matière</TableHead>
                                <TableHead>Classe</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments?.map((assignment) => (
                                <TableRow key={assignment.id}>
                                    <TableCell className="font-medium">
                                        {assignment.teacher?.user?.first_name} {assignment.teacher?.user?.last_name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{assignment.subject?.name}</span>
                                            <Badge variant="secondary" className="text-[10px]">{assignment.subject?.code}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{assignment.class?.name}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!assignments || assignments.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-20">
                                        <div className="space-y-3">
                                            <UserCog className="mx-auto h-12 w-12 text-muted-foreground/30" />
                                            <p className="text-muted-foreground">Aucune affectation configurée.</p>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href="/admin/assignments/new">Créer une affectation</Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
