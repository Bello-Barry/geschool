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
import { Banknote, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatCFA } from "@/lib/utils/formatters";

export default async function TuitionFeesPage({ params }: { params: Promise<{ ecole: string }> }) {
    const slug = (await params).ecole;
    const auth = await getAuthUser(slug);
    if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

    const supabaseAdmin = createAdminClient();
    const schoolId = auth.schoolId;

    const { data: fees } = await supabaseAdmin
        .from("tuition_fees")
        .select(`
      *,
      class:class_id(name),
      academic_year:academic_year_id(name)
    `)
        .eq("school_id", schoolId)
        .order("amount", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Frais de Scolarité</h1>
                    <p className="text-muted-foreground">Configurez les frais applicables pour chaque classe et année.</p>
                </div>
                <Button asChild>
                    <Link href={`/${slug}/admin/payments/fees/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau tarif
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tarification par classe</CardTitle>
                    <CardDescription>
                        Montants dus par les élèves en fonction de leur niveau.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Année</TableHead>
                                    <TableHead>Classe</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fees?.map((fee) => (
                                    <TableRow key={fee.id}>
                                        <TableCell>{fee.academic_year?.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{fee.class?.name || "Toutes les classes"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground italic">
                                            {fee.description || "Scolarité standard"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatCFA(fee.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!fees || fees.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="space-y-3">
                                                <Banknote className="mx-auto h-12 w-12 text-muted-foreground/30" />
                                                <p className="text-muted-foreground">Aucun tarif configuré.</p>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/${slug}/admin/payments/fees/new`}>Ajouter un tarif</Link>
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
