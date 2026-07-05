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
import { Badge } from "@/components/ui/badge";
import { BookMarked, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function SubjectsPage({ params }: { params: Promise<{ ecole: string }> }) {
    const slug = (await params).ecole;
    const auth = await getAuthUser(slug);
    if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect("/login");

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
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead className="text-center">Coefficient</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects?.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell className="font-medium">{subject.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">{subject.code || "N/A"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">
                                            {subject.coefficient}
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm">
                                            {subject.description || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/${slug}/admin/subjects/${subject.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!subjects || subjects.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="space-y-3">
                                                <BookMarked className="mx-auto h-12 w-12 text-muted-foreground/30" />
                                                <p className="text-muted-foreground">Aucune matière enregistrée.</p>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/${slug}/admin/subjects/new`}>Ajouter une matière</Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
