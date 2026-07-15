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

const parentSchema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  profession: z.string().optional(),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface ParentFormProps {
  onSuccess?: () => void;
  isLoading?: boolean;
  initialData?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    relationship?: string;
    profession?: string;
  };
}

export function ParentForm({ isLoading: externalLoading, initialData }: ParentFormProps) {
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
  } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: initialData ? {
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      email: initialData.email,
      phone: initialData.phone,
      relationship: initialData.relationship,
      profession: initialData.profession,
    } : undefined,
  });

  const onSubmit = async (data: ParentFormData) => {
    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/parents/${initialData.id}` : "/api/parents";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          relationship: data.relationship,
          profession: data.profession,
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
      router.push(isEditing ? `${slug}/admin/parents/${initialData.id}` : `${slug}/admin/parents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      if (!credentials) setLoading(false);
    }
  };

  const handleCredentialsConfirmed = () => {
    const slug = params?.ecole ? `/${params.ecole}` : "";
    router.push(`${slug}/admin/parents`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Modifier le parent" : "Nouveau parent"}</CardTitle>
        <CardDescription>{isEditing ? "Modifiez les informations du parent" : "Remplissez les informations du parent"}</CardDescription>
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
              <Input placeholder="Samuel" {...register("firstName")} className="mt-1" />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input placeholder="Mvouba" {...register("lastName")} className="mt-1" />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="parent@example.com" {...register("email")} className="mt-1" />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input placeholder="+242 06 123 4567" {...register("phone")} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Lien de parenté</label>
              <Input placeholder="Père / Mère" {...register("relationship")} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Profession</label>
              <Input placeholder="Médecin" {...register("profession")} className="mt-1" />
            </div>
          </div>

          <Button type="submit" disabled={loading || externalLoading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Mise à jour..." : "Création en cours..."}
              </>
            ) : (
              isEditing ? "Enregistrer les modifications" : "Créer le parent"
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
