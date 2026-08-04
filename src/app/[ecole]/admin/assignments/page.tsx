import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Card, CardContent } from "@/components/ui/card";
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
import { UserCog, Plus, Search, Pencil } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteAssignmentButton } from "@/components/forms/delete-assignment-button";

export default async function AssignmentsPage({ params }: { params: Promise<{ ecole: string }> }) {
    const slug = (await params).ecole;
    const auth = await getAuthUser(slug);
    if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

    const supabaseAdmin = createAdminClient();
    const schoolId = auth.schoolId;

    const { data: assignments } = await supabaseAdmin
        .from("teacher_subjects")
        .select(`
      id,
      coefficient,
      teacher:teacher_id(
        id,
        user:user_id(first_name, last_name)
      ),
      subject:subject_id(name, code, coefficient),
      class:class_id(name)
    `)
        .eq("school_id", schoolId);

    return (
        <div className="space-y-6">
            <PageHeader
              title="Affectations"
              description="Associez les enseignants aux matières et aux classes."
              actions={
                <Button asChild>
                  <Link href={`/${slug}/admin/assignments/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle affectation
                  </Link>
                </Button>
              }
            />

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
                                <TableHead className="text-center">Coefficient</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments?.map((assignment: any) => (
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
                                    <TableCell className="text-center">
                                        <Badge variant={assignment.coefficient ? "default" : "secondary"}>
                                            {assignment.coefficient ?? assignment.subject?.coefficient ?? "—"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/${slug}/admin/assignments/${assignment.id}/edit`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <DeleteAssignmentButton id={assignment.id} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!assignments || assignments.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20">
                                        <div className="space-y-3">
                                            <UserCog className="mx-auto h-12 w-12 text-muted-foreground/30" />
                                            <p className="text-muted-foreground">Aucune affectation configurée.</p>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/${slug}/admin/assignments/new`}>Créer une affectation</Link>
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
