"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const studentSchema = z.object({
  matricule: z.string().min(1, "Matricule requis"),
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  classId: z.string().uuid("Classe requise"),
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  classes: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  isLoading?: boolean;
}

export function StudentForm({ classes, onSuccess, isLoading: externalLoading }: StudentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: data.matricule,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          class_id: data.classId,
          date_of_birth: data.dateOfBirth,
          place_of_birth: data.placeOfBirth,
          gender: data.gender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvel élève</CardTitle>
        <CardDescription>Remplissez les informations de l'élève</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Matricule</label>
              <Input
                placeholder="MAT-2025-001"
                {...register("matricule")}
                className="mt-1"
              />
              {errors.matricule && (
                <p className="text-sm text-red-500 mt-1">{errors.matricule.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Genre</label>
              <Select onValueChange={(value) => setValue("gender", value as "M" | "F")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Prénom</label>
              <Input
                placeholder="Jean"
                {...register("firstName")}
                className="mt-1"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input
                placeholder="Dupont"
                {...register("lastName")}
                className="mt-1"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="jean@example.com"
                {...register("email")}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Classe</label>
              <Select onValueChange={(value) => setValue("classId", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classId && (
                <p className="text-sm text-red-500 mt-1">{errors.classId.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Date de naissance</label>
              <Input
                type="date"
                {...register("dateOfBirth")}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Lieu de naissance</label>
              <Input
                placeholder="Brazzaville"
                {...register("placeOfBirth")}
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading || externalLoading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer l'élève"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
