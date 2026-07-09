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
}

export function ClassForm({ academicYears }: ClassFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();

  const defaultYear = academicYears.find(y => y.is_current)?.id || "";

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { academic_year_id: defaultYear },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          level: data.level,
          academic_year_id: data.academic_year_id,
          capacity: data.capacity ? parseInt(data.capacity) : undefined,
          room_number: data.room_number || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur lors de la création");
      }
      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(`${slug}/admin/classes`);
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
        <CardTitle>Nouvelle classe</CardTitle>
        <CardDescription>Créez une nouvelle classe ou section</CardDescription>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : "Créer la classe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
