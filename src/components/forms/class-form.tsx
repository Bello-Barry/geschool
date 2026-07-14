"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  level: z.string().min(1, "Niveau requis"),
  academic_year_id: z.string().uuid("Année scolaire requise"),
  capacity: z.string().optional(),
  room_number: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClassFormProps {
  academicYears: Array<{ id: string; name: string; is_current: boolean }>;
  initialData?: {
    id: string;
    name: string;
    level: string;
    academic_year_id: string;
    capacity?: string | null;
    room_number?: string | null;
  };
}

export function ClassForm({ academicYears, initialData }: ClassFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const isEditing = !!initialData;

  const defaultYear = isEditing
    ? initialData.academic_year_id
    : (academicYears.find(y => y.is_current)?.id || "");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData ? {
      name: initialData.name,
      level: initialData.level,
      academic_year_id: initialData.academic_year_id,
      capacity: initialData.capacity || "",
      room_number: initialData.room_number || "",
    } : { academic_year_id: defaultYear },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = isEditing ? `/api/classes/${initialData.id}` : "/api/classes";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          level: data.level,
          academic_year_id: data.academic_year_id,
          capacity: data.capacity ? parseInt(data.capacity) : null,
          room_number: data.room_number || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur lors de la sauvegarde");
      }

      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(isEditing ? `${slug}/admin/classes/${initialData.id}` : `${slug}/admin/classes`);
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
        <CardTitle>{isEditing ? "Modifier la classe" : "Nouvelle classe"}</CardTitle>
        <CardDescription>{isEditing ? "Modifiez les informations de la classe" : "Créez une nouvelle classe ou section"}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input placeholder="6ème A" {...register("name")} className="mt-1" />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Niveau</label>
              <Input placeholder="6ème" {...register("level")} className="mt-1" />
              {errors.level && <p className="text-sm text-red-500 mt-1">{errors.level.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Capacité</label>
              <Input type="number" placeholder="30" {...register("capacity")} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Salle</label>
              <Input placeholder="R101" {...register("room_number")} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Année scolaire</label>
            <Select
              defaultValue={defaultYear}
              onValueChange={(value) => setValue("academic_year_id", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner une année" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(En cours)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.academic_year_id && (
              <p className="text-sm text-red-500 mt-1">{errors.academic_year_id.message}</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditing ? "Mise à jour..." : "Création..."}</> : (isEditing ? "Enregistrer les modifications" : "Créer la classe")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
