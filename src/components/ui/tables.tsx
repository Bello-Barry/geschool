"use client";

import { DataTable, SearchableGrid } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Pencil, Trash2 } from "lucide-react";

export function ClassesGrid({ data, slug }: { data: any[]; slug: string }) {
  return (
    <SearchableGrid
      data={data}
      searchFields={["name", "level"]}
      emptyMessage="Aucune classe créée pour le moment"
      gridCols="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      renderItem={(cls: any) => (
        <Link key={cls.id} href={`/${slug}/admin/classes/${cls.id}`} className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>{cls.level}</CardDescription>
                </div>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Élèves</span>
                <span className="font-semibold">
                  {cls.students?.[0]?.count || 0}/{cls.capacity || "-"}
                </span>
              </div>
              {cls.room_number && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Salle</span>
                  <span className="font-semibold">{cls.room_number}</span>
                </div>
              )}
              <Button className="w-full mt-4">Gérer</Button>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}

export function StudentsTable({ data, slug }: { data: any[]; slug: string }) {
  return (
    <DataTable
      data={data}
      searchFields={["user.first_name", "user.last_name", "matricule"]}
      emptyMessage="Aucun élève inscrit pour le moment"
      showInactiveToggle
      columns={[
        { key: "matricule", label: "Matricule", render: (s: any) => s.matricule },
        { key: "name", label: "Nom", render: (s: any) => `${s.user?.first_name} ${s.user?.last_name}` },
        { key: "email", label: "Email", render: (s: any) => s.user?.email },
        { key: "class", label: "Classe", render: (s: any) => s.class?.name || "-" },
        {
          key: "status", label: "Statut",
          render: (s: any) => (
            <Badge variant={s.is_active === false ? "secondary" : "outline"}>
              {s.is_active === false ? "Inactif" : "Actif"}
            </Badge>
          ),
        },
        {
          key: "actions", label: "Actions", className: "w-[80px]",
          render: (s: any) => (
            <Link href={`/${slug}/admin/students/${s.id}`}>
              <Button variant="outline" size="sm">Voir</Button>
            </Link>
          ),
        },
      ]}
      renderMobileCard={(s: any) => (
        <Card className="border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-semibold">{s.user?.first_name} {s.user?.last_name}</p>
                <p className="text-sm text-muted-foreground">{s.matricule}</p>
              </div>
              <Badge variant={s.is_active === false ? "secondary" : "outline"}>
                {s.is_active === false ? "Inactif" : "Actif"}
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Classe:</span> {s.class?.name || "-"}</p>
            </div>
            <div className="pt-1">
              <Link href={`/${slug}/admin/students/${s.id}`}>
                <Button variant="outline" size="sm" className="w-full">Voir</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}

export function ParentsTable({ data, slug }: { data: any[]; slug: string }) {
  return (
    <DataTable
      data={data}
      searchFields={["user.first_name", "user.last_name", "user.email"]}
      emptyMessage="Aucun parent inscrit pour le moment"
      showInactiveToggle
      columns={[
        { key: "name", label: "Nom", render: (p: any) => `${p.user?.first_name} ${p.user?.last_name}` },
        { key: "email", label: "Email", render: (p: any) => p.user?.email },
        { key: "phone", label: "Téléphone", render: (p: any) => p.user?.phone || "-" },
        { key: "relationship", label: "Lien de parenté", render: (p: any) => p.relationship || "-" },
        { key: "profession", label: "Profession", render: (p: any) => p.profession || "-" },
        {
          key: "status", label: "Statut",
          render: (p: any) => (
            <Badge variant={p.is_active === false ? "secondary" : "outline"}>
              {p.is_active === false ? "Inactif" : "Actif"}
            </Badge>
          ),
        },
        {
          key: "actions", label: "Actions", className: "w-[80px]",
          render: (p: any) => (
            <Link href={`/${slug}/admin/parents/${p.id}`}>
              <Button variant="outline" size="sm">Voir</Button>
            </Link>
          ),
        },
      ]}
      renderMobileCard={(p: any) => (
        <Card className="border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-semibold">{p.user?.first_name} {p.user?.last_name}</p>
                <p className="text-sm text-muted-foreground">{p.user?.email}</p>
              </div>
              <Badge variant={p.is_active === false ? "secondary" : "outline"}>
                {p.is_active === false ? "Inactif" : "Actif"}
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              {p.user?.phone && <p><span className="text-muted-foreground">Tél:</span> {p.user.phone}</p>}
              {p.relationship && <p><span className="text-muted-foreground">Lien:</span> {p.relationship}</p>}
              {p.profession && <p><span className="text-muted-foreground">Profession:</span> {p.profession}</p>}
            </div>
            <div className="pt-1">
              <Link href={`/${slug}/admin/parents/${p.id}`}>
                <Button variant="outline" size="sm" className="w-full">Voir</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}

export function SubjectsTable({ data, slug }: { data: any[]; slug: string }) {
  return (
    <DataTable
      data={data}
      searchFields={["name", "code"]}
      emptyMessage="Aucune matière enregistrée"
      columns={[
        { key: "name", label: "Nom", render: (s: any) => <span className="font-medium">{s.name}</span> },
        { key: "code", label: "Code", render: (s: any) => <Badge variant="outline" className="font-mono">{s.code || "N/A"}</Badge> },
        { key: "coefficient", label: "Coefficient", className: "text-center", render: (s: any) => <span className="font-bold">{s.coefficient}</span> },
        { key: "description", label: "Description", render: (s: any) => <span className="max-w-[300px] truncate text-muted-foreground text-sm inline-block">{s.description || "—"}</span> },
        {
          key: "actions", label: "Actions", className: "text-right",
          render: (s: any) => (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/${slug}/admin/subjects/${s.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ]}
      renderMobileCard={(s: any) => (
        <Card className="border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-semibold">{s.name}</p>
                <Badge variant="outline" className="font-mono">{s.code || "N/A"}</Badge>
              </div>
              <span className="text-lg font-bold">{s.coefficient}</span>
            </div>
            {s.description && (
              <p className="text-sm text-muted-foreground truncate">{s.description}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Link href={`/${slug}/admin/subjects/${s.id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Pencil className="mr-1 h-3 w-3" /> Modifier
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}

export function TeachersGrid({ data, slug }: { data: any[]; slug: string }) {
  return (
    <SearchableGrid
      data={data}
      searchFields={["user.first_name", "user.last_name", "user.email"]}
      emptyMessage="Aucun enseignant inscrit pour le moment"
      showInactiveToggle
      renderItem={(teacher: any) => (
        <Card key={teacher.id} className="border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">
                  {teacher.user?.first_name} {teacher.user?.last_name}
                  {teacher.is_active === false && (
                    <Badge variant="secondary" className="ml-2">Inactif</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {teacher.specialization || "Général"}
                </CardDescription>
              </div>
              <Link href={`/${slug}/admin/teachers/${teacher.id}`}>
                <Button variant="ghost" size="sm">Voir</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Email:</strong> {teacher.user?.email}</p>
            <p><strong>ID Employé:</strong> {teacher.employee_id || "-"}</p>
            {teacher.teacher_subjects && teacher.teacher_subjects.length > 0 && (
              <div>
                <strong>Classes:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {teacher.teacher_subjects.map((ts: any, i: number) => (
                    <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                      {ts.class?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    />
  );
}
