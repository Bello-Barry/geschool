"use client";

import { DataTable, SearchableGrid } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
