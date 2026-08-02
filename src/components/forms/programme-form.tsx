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
  subject_id: z.string().min(1, "Matière requise"),
  class_id: z.string().min(1, "Classe requise"),
  term_id: z.string().min(1, "Trimestre requis"),
  week_number: z.coerce.number().int().positive("Numéro de semaine requis"),
  topic: z.string().min(1, "Thème requis"),
  learning_objectives: z.string().optional(),
  resources: z.string().optional(),
  evaluation_method: z.string().optional(),
  status: z.string().default("draft"),
});

type FormData = z.infer<typeof schema>;

interface Option {
  id: string;
  name: string;
}

interface ProgrammeFormProps {
  subjects: Option[];
  classes: Option[];
  terms: Option[];
  initialData?: {
    id: string;
    subject_id: string;
    class_id: string;
    term_id: string;
    week_number: number;
    topic: string;
    learning_objectives: string | null;
    resources: string | null;
    evaluation_method: string | null;
    status: string;
  };
}

export function ProgrammeForm({ subjects, classes, terms, initialData }: ProgrammeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const isEditing = !!initialData;
  const slug = params?.ecole as string;

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    mode: "onTouched",
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      subject_id: initialData.subject_id,
      class_id: initialData.class_id,
      term_id: initialData.term_id,
      week_number: initialData.week_number,
      topic: initialData.topic,
      learning_objectives: initialData.learning_objectives || "",
      resources: initialData.resources || "",
      evaluation_method: initialData.evaluation_method || "",
      status: initialData.status,
    } : { status: "draft" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = isEditing ? `/api/programmes/${initialData.id}` : "/api/programmes";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          week_number: Number(data.week_number),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        const msg = typeof err.error === "string" ? err.error : "Erreur lors de la sauvegarde";
        if (msg.includes("duplicate") || msg.includes("violates unique constraint")) {
          throw new Error("Cette semaine existe déjà pour cette matière, classe et trimestre");
        }
        throw new Error(msg);
      }

      router.push(`/${slug}/admin/programme`);
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
        <CardTitle>{isEditing ? "Modifier l'entrée" : "Nouvelle entrée"}</CardTitle>
        <CardDescription>
          {isEditing ? "Modifiez cette entrée du programme" : "Ajoutez une entrée au programme pédagogique"}
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Matière</label>
              <Select
                onValueChange={(v) => setValue("subject_id", v)}
                defaultValue={initialData?.subject_id}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject_id && <p className="text-sm text-red-500 mt-1">{errors.subject_id.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Classe</label>
              <Select
                onValueChange={(v) => setValue("class_id", v)}
                defaultValue={initialData?.class_id}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.class_id && <p className="text-sm text-red-500 mt-1">{errors.class_id.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Trimestre</label>
              <Select
                onValueChange={(v) => setValue("term_id", v)}
                defaultValue={initialData?.term_id}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.term_id && <p className="text-sm text-red-500 mt-1">{errors.term_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Semaine n°</label>
              <Input type="number" min={1} placeholder="1" {...register("week_number")} className="mt-1" />
              {errors.week_number && <p className="text-sm text-red-500 mt-1">{errors.week_number.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Statut</label>
              <Select
                onValueChange={(v) => setValue("status", v)}
                defaultValue={initialData?.status || "draft"}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Thème / Chapitre</label>
            <Input placeholder="Équations du premier degré" {...register("topic")} className="mt-1" />
            {errors.topic && <p className="text-sm text-red-500 mt-1">{errors.topic.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Objectifs pédagogiques</label>
            <Textarea placeholder="Objectifs d'apprentissage pour cette semaine" rows={3} {...register("learning_objectives")} className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Ressources / Supports</label>
            <Textarea placeholder="Manuels, exercices, vidéos..." rows={2} {...register("resources")} className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Méthode d'évaluation</label>
            <Textarea placeholder="Interrogation écrite, exposé, devoir..." rows={2} {...register("evaluation_method")} className="mt-1" />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditing ? "Mise à jour..." : "Création..."}</> : (isEditing ? "Enregistrer" : "Créer l'entrée")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
