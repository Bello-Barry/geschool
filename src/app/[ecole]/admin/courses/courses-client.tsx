"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { unwrapJoin } from "@/lib/utils/supabase-join";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Course {
  id: string;
  title: string;
  key_points: string;
  status: string;
  created_at: string;
  class: any;
  subject: any;
  teacher: any;
}

interface CoursesClientProps {
  initialCourses: Course[];
  classes: any[];
  subjects: any[];
  teachers: any[];
}

export function CoursesClient({ initialCourses, classes, subjects, teachers }: CoursesClientProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const cls = unwrapJoin(course.class) as any;
      const subj = unwrapJoin(course.subject) as any;
      const teach = unwrapJoin(course.teacher) as any;

      const matchesSearch =
        !search.trim() ||
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        (course.key_points && course.key_points.toLowerCase().includes(search.toLowerCase()));

      const matchesClass = !selectedClass || cls?.id === selectedClass;
      const matchesSubject = !selectedSubject || subj?.id === selectedSubject;
      const matchesTeacher = !selectedTeacher || teach?.id === selectedTeacher;
      const matchesStatus = !selectedStatus || course.status === selectedStatus;

      return matchesSearch && matchesClass && matchesSubject && matchesTeacher && matchesStatus;
    });
  }, [courses, search, selectedClass, selectedSubject, selectedTeacher, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedCourses = filteredCourses.slice(start, start + pageSize);

  const handleDelete = async (courseId: string, title: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le cours "${title}" ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      toast.success("Cours supprimé avec succès");
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Impossible de supprimer le cours");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-gray-50 p-4 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par titre ou mot-clé..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 md:flex flex-wrap gap-2">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm col-span-2 md:col-span-1"
          >
            <option value="">Tous les enseignants</option>
            {teachers.map((t) => {
              const u = unwrapJoin(t.user) as any;
              return (
                <option key={t.id} value={t.id}>
                  {u ? `${u.first_name} ${u.last_name}` : "—"}
                </option>
              );
            })}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="published">Publié</option>
            <option value="draft">Brouillon</option>
          </select>
        </div>
      </div>

      {/* Courses table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-semibold">Titre</th>
              <th className="text-left p-3 font-semibold">Classe</th>
              <th className="text-left p-3 font-semibold">Matière</th>
              <th className="text-left p-3 font-semibold">Enseignant</th>
              <th className="text-left p-3 font-semibold">Statut</th>
              <th className="text-left p-3 font-semibold">Créé le</th>
              <th className="text-center p-3 font-semibold w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Aucun cours trouvé.
                </td>
              </tr>
            ) : (
              pagedCourses.map((course) => {
                const cls = unwrapJoin(course.class) as any;
                const subj = unwrapJoin(course.subject) as any;
                const teach = unwrapJoin(course.teacher) as any;
                const teachUser = teach ? unwrapJoin(teach.user) as any : null;

                return (
                  <tr key={course.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <div className="max-w-[250px] truncate" title={course.title}>
                        {course.title}
                      </div>
                    </td>
                    <td className="p-3">{cls?.name || "—"}</td>
                    <td className="p-3">{subj?.name || "—"}</td>
                    <td className="p-3">
                      {teachUser ? `${teachUser.first_name} ${teachUser.last_name}` : "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {course.status === "published" ? "Publié" : "Brouillon"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(course.id, course.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {filteredCourses.length} cours trouvé{filteredCourses.length > 1 ? "s" : ""}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(Math.max(1, safePage - 1));
                  }}
                  className={safePage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === safePage}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p);
                      }}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(Math.min(totalPages, safePage + 1));
                  }}
                  className={safePage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
