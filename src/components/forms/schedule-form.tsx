"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const schema = z.object({
  class_id: z.string().min(1, "Classe requise"),
  teacher_subject_id: z.string().min(1, "Affectation requise"),
  day_of_week: z.string().min(1, "Jour requis"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM requis"),
  room_number: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DAYS = [
  { value: "0", label: "Lundi" },
  { value: "1", label: "Mardi" },
  { value: "2", label: "Mercredi" },
  { value: "3", label: "Jeudi" },
  { value: "4", label: "Vendredi" },
  { value: "5", label: "Samedi" },
  { value: "6", label: "Dimanche" },
];

interface ClassOption {
  id: string;
  name: string;
}

interface TeacherSubjectOption {
  id: string;
  teacher_name: string;
  subject_name: string;
  class_name: string;
  class_id: string;
}

interface ScheduleFormProps {
  classes: ClassOption[];
  teacherSubjects: TeacherSubjectOption[];
  initialData?: {
    id: string;
    class_id: string;
    teacher_subject_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_number: string | null;
  };
}

export function ScheduleForm({ classes, teacherSubjects, initialData }: ScheduleFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(initialData?.class_id);
  const router = useRouter();
  const params = useParams();
  const isEditing = !!initialData;

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    mode: "onTouched",
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      class_id: initialData.class_id,
      teacher_subject_id: initialData.teacher_subject_id,
      day_of_week: String(initialData.day_of_week),
      start_time: initialData.start_time.slice(0, 5),
      end_time: initialData.end_time.slice(0, 5),
      room_number: initialData.room_number || "",
    } : { day_of_week: "0", room_number: "" },
  });

  const daySlots = teacherSubjects.filter((ts) => {
    if (!ts.subject_name || !ts.teacher_name) return false;
    if (selectedClassId) return ts.class_id === selectedClassId;
    return true;
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = isEditing ? `/api/schedule-slots/${initialData.id}` : "/api/schedule-slots";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: data.class_id,
          teacher_subject_id: data.teacher_subject_id,
          day_of_week: parseInt(data.day_of_week),
          start_time: data.start_time,
          end_time: data.end_time,
          room_number: data.room_number || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(typeof err.error === "string" ? err.error : "Erreur lors de la sauvegarde");
      }

      const slug = params?.ecole ? `/${params.ecole}` : "";
      router.push(`${slug}/admin/schedule`);
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
        <CardTitle>{isEditing ? "Modifier le créneau" : "Nouveau créneau"}</CardTitle>
        <CardDescription>
          {isEditing ? "Modifiez les informations du créneau horaire" : "Ajoutez un nouveau créneau à l'emploi du temps"}
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
            <label className="text-sm font-medium">Classe</label>
            <Select
              onValueChange={(v) => { setValue("class_id", v); setValue("teacher_subject_id", ""); setSelectedClassId(v); }}
              defaultValue={initialData?.class_id}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner une classe" />
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
            <label className="text-sm font-medium">Matière / Enseignant</label>
            <Select
              onValueChange={(v) => setValue("teacher_subject_id", v)}
              defaultValue={initialData?.teacher_subject_id}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {daySlots.map((ts) => (
                  <SelectItem key={ts.id} value={ts.id}>
                    {ts.subject_name} — {ts.teacher_name} ({ts.class_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.teacher_subject_id && <p className="text-sm text-red-500 mt-1">{errors.teacher_subject_id.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Jour</label>
            <Select
              onValueChange={(v) => setValue("day_of_week", v)}
              defaultValue={initialData ? String(initialData.day_of_week) : "0"}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un jour" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.day_of_week && <p className="text-sm text-red-500 mt-1">{errors.day_of_week.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Début</label>
              <Input type="time" {...register("start_time")} className="mt-1" />
              {errors.start_time && <p className="text-sm text-red-500 mt-1">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Fin</label>
              <Input type="time" {...register("end_time")} className="mt-1" />
              {errors.end_time && <p className="text-sm text-red-500 mt-1">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Salle</label>
            <Input placeholder="Salle 12" {...register("room_number")} className="mt-1" />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditing ? "Mise à jour..." : "Création..."}</> : (isEditing ? "Enregistrer" : "Créer le créneau")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
