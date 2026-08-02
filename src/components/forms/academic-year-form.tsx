"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  start_date: z.string().min(1, "Date de début requise"),
  end_date: z.string().min(1, "Date de fin requise"),
  is_current: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function AcademicYearForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    mode: "onTouched",
    resolver: zodResolver(schema),
    defaultValues: { is_current: false, name: "", start_date: "", end_date: "" },
  });

  const isCurrent = watch("is_current");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur lors de la création");
      }
      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(`${slug}/admin/academic-years`);
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
        <CardTitle>Nouvelle année scolaire</CardTitle>
        <CardDescription>Définissez la période académique</CardDescription>
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
            <Input placeholder="2025-2026" {...register("name")} className="mt-1" />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date de début</label>
              <Input type="date" {...register("start_date")} className="mt-1" />
              {errors.start_date && <p className="text-sm text-red-500 mt-1">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Date de fin</label>
              <Input type="date" {...register("end_date")} className="mt-1" />
              {errors.end_date && <p className="text-sm text-red-500 mt-1">{errors.end_date.message}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_current"
              checked={isCurrent}
              onCheckedChange={(v) => setValue("is_current", v === true)}
            />
            <label htmlFor="is_current" className="text-sm font-medium cursor-pointer">
              Année en cours
            </label>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : "Créer l'année scolaire"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
