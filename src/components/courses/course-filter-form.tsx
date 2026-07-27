"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface CourseFilterFormProps {
  subjects: { id: string; name: string }[];
  defaultQ?: string;
  defaultSubjectId?: string;
}

export function CourseFilterForm({ subjects, defaultQ, defaultSubjectId }: CourseFilterFormProps) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const q = form.get("q")?.toString() || "";
    const subject_id = form.get("subject_id")?.toString() || "";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (subject_id) params.set("subject_id", subject_id);
    router.push(`?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          name="q"
          defaultValue={defaultQ || ""}
          placeholder="Rechercher un cours..."
          className="pl-10"
        />
      </div>
      <select
        name="subject_id"
        className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
        defaultValue={defaultSubjectId || ""}
        onChange={(e) => {
          const form = e.target.closest("form");
          if (form) form.requestSubmit();
        }}
      >
        <option value="">Toutes les matières</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <Button type="submit" variant="secondary" className="sm:w-auto">
        Filtrer
      </Button>
    </form>
  );
}
