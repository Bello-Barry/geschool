"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { CredentialsModal } from "./credentials-modal";

const teacherSchema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  specialization: z.string().optional(),
  employeeId: z.string().optional(),
  hireDate: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherFormProps {
  onSuccess?: () => void;
  isLoading?: boolean;
  initialData?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    specialization?: string;
    employeeId?: string;
    hireDate?: string;
  };
}

export function TeacherForm({ isLoading: externalLoading, initialData }: TeacherFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const router = useRouter();
  const params = useParams();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherFormData>({
    mode: "onTouched",
    resolver: zodResolver(teacherSchema),
    defaultValues: initialData ? {
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      email: initialData.email,
      specialization: initialData.specialization,
      employeeId: initialData.employeeId,
      hireDate: initialData.hireDate,
    } : undefined,
  });

  const onSubmit = async (data: TeacherFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/teachers/${initialData.id}` : "/api/teachers";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          specialization: data.specialization,
          employee_id: data.employeeId,
          hire_date: data.hireDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }

      if (!isEditing) {
        const result = await response.json();
        if (result.tempPassword) {
          setCredentials({
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            tempPassword: result.tempPassword,
          });
          setLoading(false);
          return;
        }
      }

      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(isEditing ? `${slug}/admin/teachers/${initialData.id}` : `${slug}/admin/teachers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      if (!credentials) setLoading(false);
    }
  };

  const handleCredentialsConfirmed = () => {
    const slug = params?.ecole ? `/${params.ecole}` : "";
    router.push(`${slug}/admin/teachers`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Modifier l'enseignant" : "Nouvel enseignant"}</CardTitle>
        <CardDescription>{isEditing ? "Modifiez les informations de l'enseignant" : "Remplissez les informations de l'enseignant"}</CardDescription>
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
              <label className="text-sm font-medium">Prénom</label>
              <Input placeholder="Marc" {...register("firstName")} className="mt-1" />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input placeholder="Tshiani" {...register("lastName")} className="mt-1" />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="enseignant@ecole.com" {...register("email")} className="mt-1" />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Spécialisation</label>
              <Input placeholder="Mathématiques" {...register("specialization")} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Identifiant employé</label>
              <Input placeholder="EMP-001" {...register("employeeId")} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Date d'embauche</label>
              <Input type="date" {...register("hireDate")} className="mt-1" />
            </div>
          </div>

          <Button type="submit" disabled={loading || externalLoading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Mise à jour..." : "Création en cours..."}
              </>
            ) : (
              isEditing ? "Enregistrer les modifications" : "Créer l'enseignant"
            )}
          </Button>
        </form>

        <CredentialsModal
          open={credentials !== null}
          name={credentials?.name || ""}
          email={credentials?.email || ""}
          tempPassword={credentials?.tempPassword || ""}
          onConfirm={handleCredentialsConfirmed}
        />
      </CardContent>
    </Card>
  );
}
