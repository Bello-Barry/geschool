"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, X, Paperclip, File } from "lucide-react";

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  signed_url?: string | null;
}

interface Course {
  id: string;
  title: string;
  key_points: string;
  status: string;
  subject_id: string;
  class_id: string;
  attachments?: Attachment[];
}

interface CourseFormProps {
  slug: string;
  subjects: SubjectOption[];
  classes: ClassOption[];
  course?: Course;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function CourseForm({ slug, subjects, classes, course }: CourseFormProps) {
  const router = useRouter();
  const isEdit = !!course;
  const [title, setTitle] = useState(course?.title ?? "");
  const [keyPoints, setKeyPoints] = useState(course?.key_points ?? "");
  const [status, setStatus] = useState(course?.status ?? "draft");
  const [subjectId, setSubjectId] = useState(course?.subject_id ?? "");
  const [classId, setClassId] = useState(course?.class_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(course?.attachments ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    if (!subjectId || !classId) {
      setError("Veuillez sélectionner une matière et une classe");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEdit
        ? `/api/courses/${course!.id}`
        : "/api/courses";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          key_points: keyPoints,
          status,
          subject_id: subjectId,
          class_id: classId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur lors de l'enregistrement");
      }

      const savedCourse = await res.json();

      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const attRes = await fetch(`/api/courses/${savedCourse.id}/attachments`, {
            method: "POST",
            body: formData,
          });
          if (!attRes.ok) {
            const errData = await attRes.json();
            console.error("Upload failed:", errData);
          }
        }
        setUploading(false);
      }

      router.push(`/${slug}/teacher/courses`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeSelectedFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (!course) return;
    try {
      const res = await fetch(`/api/courses/${course.id}/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      }
    } catch (err) {
      console.error("Delete attachment error:", err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titre du cours</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introduction aux fractions"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Matière</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_points">Points clés</Label>
            <Textarea
              id="key_points"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="Saisissez les points clés du cours (un par ligne ou en markdown)"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pièces jointes</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Ajouter un fichier
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileSelect}
              />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 shrink-0" />
                      <span className="truncate">{att.file_name}</span>
                      <span className="text-gray-400 text-xs shrink-0">
                        ({formatFileSize(att.file_size)})
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeAttachment(att)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="space-y-1 mt-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-400 text-xs shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSelectedFile(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Upload des fichiers...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving || uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sauvegarde...</>
          ) : (
            isEdit ? "Enregistrer" : "Créer le cours"
          )}
        </Button>
      </div>
    </div>
  );
}
