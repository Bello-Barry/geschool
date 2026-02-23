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
import { Calendar, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";

export default async function AcademicYearsPage() {
    const supabase = await createClient();
    const headersList = await headers();
    const schoolId = headersList.get("x-school-id");

    if (!schoolId) redirect("/login");

    // Charger les années scolaires avec leurs trimestres
    const { data: academicYears } = await supabase
        .from("academic_years")
        .select(`
      *,
      terms (*)
    `)
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Années Scolaires</h1>
                    <p className="text-muted-foreground">Gérez les périodes académiques et les trimestres.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/academic-years/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle année
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6">
                {academicYears?.map((year) => (
                    <Card key={year.id} className={year.is_current ? "border-primary shadow-sm" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle>{year.name}</CardTitle>
                                    {year.is_current && <Badge>Année en cours</Badge>}
                                </div>
                                <CardDescription>
                                    Du {formatDate(year.start_date)} au {formatDate(year.end_date)}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/academic-years/${year.id}/edit`}>
                                        <Settings2 className="h-4 w-4 mr-2" />
                                        Modifier
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Trimestre</TableHead>
                                            <TableHead>Début</TableHead>
                                            <TableHead>Fin</TableHead>
                                            <TableHead className="text-right">Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {year.terms?.sort((a: any, b: any) => a.term_number - b.term_number).map((term: any) => (
                                            <TableRow key={term.id}>
                                                <TableCell className="font-medium">{term.name}</TableCell>
                                                <TableCell>{formatDate(term.start_date)}</TableCell>
                                                <TableCell>{formatDate(term.end_date)}</TableCell>
                                                <TableCell className="text-right">
                                                    {term.is_current ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">Actuel</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">Passé/Futur</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!year.terms || year.terms.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground italic">
                                                    Aucun trimestre configuré pour cette année.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {(!academicYears || academicYears.length === 0) && (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/30">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">Aucune année scolaire</h3>
                        <p className="text-muted-foreground mb-6">Commencez par créer votre première année académique.</p>
                        <Button asChild>
                            <Link href="/admin/academic-years/new">Créer une année scolaire</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
