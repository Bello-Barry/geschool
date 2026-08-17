"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Titre requis"),
  content: z.string().min(1, "Contenu requis"),
  audience: z.enum(["all", "teachers", "parents", "students"]),
  status: z.enum(["draft", "published"]),
});

type FormData = z.infer<typeof schema>;

interface AnnouncementFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
    audience: "all" | "teachers" | "parents" | "students";
    status: "draft" | "published";
  };
}

export function AnnouncementForm({ initialData }: AnnouncementFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const isEditing = !!initialData;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    mode: "onTouched",
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      title: initialData.title,
      content: initialData.content,
      audience: initialData.audience,
      status: initialData.status,
    } : { audience: "all", status: "draft" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = isEditing ? `/api/announcements/${initialData.id}` : "/api/announcements";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          audience: data.audience,
          status: data.status,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || err.error || "Erreur lors de la sauvegarde");
      }

      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(`${slug}/admin/announcements`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Modifier l'annonce" : "Nouvelle annonce"}</CardTitle>
        <CardDescription>
          L&apos;annonce sera visible par les personnes visées dès publication.
        </CardDescription>
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
            <label className="text-sm font-medium">Titre</label>
            <Input placeholder="Rentrée scolaire 2026-2027" {...register("title")} className="mt-1" />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Contenu</label>
            <Textarea
              placeholder="Informations destinées aux membres de l'établissement..."
              rows={6}
              {...register("content")}
              className="mt-1"
            />
            {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Audience</label>
              <Select onValueChange={(v) => setValue("audience", v as FormData["audience"])} defaultValue={initialData?.audience ?? "all"}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout le monde</SelectItem>
                  <SelectItem value="teachers">Enseignants</SelectItem>
                  <SelectItem value="parents">Parents</SelectItem>
                  <SelectItem value="students">Élèves</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Statut</label>
              <Select onValueChange={(v) => setValue("status", v as FormData["status"])} defaultValue={initialData?.status ?? "draft"}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publiée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditing ? "Mise à jour..." : "Création..."}</> : (isEditing ? "Enregistrer" : "Créer l'annonce")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}