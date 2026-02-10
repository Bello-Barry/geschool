"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

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
}

export function ParentForm({ onSuccess, isLoading: externalLoading }: ParentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
  });

  const onSubmit = async (data: ParentFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/parents", {
        method: "POST",
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
        <CardTitle>Nouveau parent</CardTitle>
        <CardDescription>Remplissez les informations du parent</CardDescription>
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
              <label className="text-sm font-medium">Prénom</label>
              <Input
                placeholder="Samuel"
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
                placeholder="Mvouba"
                {...register("lastName")}
                className="mt-1"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="parent@example.com"
                {...register("email")}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                placeholder="+242 06 123 4567"
                {...register("phone")}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Lien de parenté</label>
              <Input
                placeholder="Père / Mère"
                {...register("relationship")}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Profession</label>
              <Input
                placeholder="Médecin"
                {...register("profession")}
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
              "Créer le parent"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
