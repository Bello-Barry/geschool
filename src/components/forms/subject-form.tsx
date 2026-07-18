"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  code: z.string().optional(),
  coefficient: z.coerce.number().int().positive("Le coefficient doit être un entier positif").optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SubjectFormProps {
  initialData?: {
    id: string;
    name: string;
    code: string | null;
    coefficient: number;
    description: string | null;
  };
}

export function SubjectForm({ initialData }: SubjectFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const isEditing = !!initialData;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      name: initialData.name,
      code: initialData.code || "",
      coefficient: initialData.coefficient,
      description: initialData.description || "",
    } : { coefficient: 1 },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = isEditing ? `/api/subjects/${initialData.id}` : "/api/subjects";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          code: data.code || null,
          coefficient: data.coefficient ? Number(data.coefficient) : 1,
          description: data.description || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || err.error || "Erreur lors de la sauvegarde");
      }

      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(`${slug}/admin/subjects`);
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
        <CardTitle>{isEditing ? "Modifier la matière" : "Nouvelle matière"}</CardTitle>
        <CardDescription>
          {isEditing ? "Modifiez les informations de la matière" : "Ajoutez une nouvelle matière enseignée dans votre établissement"}
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
            <label className="text-sm font-medium">Nom</label>
            <Input placeholder="Mathématiques" {...register("name")} className="mt-1" />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Code</label>
              <Input placeholder="MATH" {...register("code")} className="mt-1" />
              {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Coefficient</label>
              <Input type="number" placeholder="4" {...register("coefficient")} className="mt-1" />
              {errors.coefficient && <p className="text-sm text-red-500 mt-1">{errors.coefficient.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea placeholder="Description optionnelle" {...register("description")} className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditing ? "Mise à jour..." : "Création..."}</> : (isEditing ? "Enregistrer" : "Créer la matière")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
