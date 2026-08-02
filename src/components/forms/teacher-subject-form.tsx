"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  teacher_id: z.string().uuid("Enseignant requis"),
  subject_id: z.string().uuid("Matière requise"),
  class_id: z.string().uuid("Classe requise"),
});

type FormData = z.infer<typeof schema>;

interface TeacherSubjectFormProps {
  teachers: Array<{ id: string; user: { first_name: string; last_name: string } | null | undefined }>;
  subjects: Array<{ id: string; name: string; code: string | null }>;
  classes: Array<{ id: string; name: string }>;
}

export function TeacherSubjectForm({ teachers, subjects, classes }: TeacherSubjectFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();

  const { handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    mode: "onTouched",
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/teacher-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Erreur lors de la création");
      }
      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(`${slug}/admin/assignments`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle affectation</CardTitle>
        <CardDescription>Associez un enseignant à une matière et une classe</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="text-sm font-medium">Enseignant</label>
            {teachers.length === 0 ? (
              <p className="text-sm text-amber-600 mt-1">Aucun enseignant disponible. Créez d&apos;abord des enseignants.</p>
            ) : (
              <Select onValueChange={(value) => setValue("teacher_id", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user?.first_name} {t.user?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.teacher_id && <p className="text-sm text-red-500 mt-1">{errors.teacher_id.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Matière</label>
            {subjects.length === 0 ? (
              <p className="text-sm text-amber-600 mt-1">Aucune matière disponible. <Link href={`/${params?.ecole}/admin/subjects/new`} className="underline">Créez d&apos;abord des matières.</Link></p>
            ) : (
              <Select onValueChange={(value) => setValue("subject_id", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.subject_id && <p className="text-sm text-red-500 mt-1">{errors.subject_id.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Classe</label>
            {classes.length === 0 ? (
              <p className="text-sm text-amber-600 mt-1">Aucune classe disponible. Créez d&apos;abord des classes.</p>
            ) : (
              <Select onValueChange={(value) => setValue("class_id", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.class_id && <p className="text-sm text-red-500 mt-1">{errors.class_id.message}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : "Créer l'affectation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
