"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  status: string;
  created_at: string;
  creator?: { id: string; email: string }[] | { id: string; email: string } | null;
  [key: string]: unknown;
}

interface AnnouncementsTableClientProps {
  slug: string;
  announcements: Announcement[];
  audienceLabel: (audience: string) => string;
}

export function AnnouncementsTableClient({ slug, announcements, audienceLabel }: AnnouncementsTableClientProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleStatus(a: Announcement) {
    if (pendingId) return;
    setPendingId(a.id);
    try {
      const next = a.status === "published" ? "draft" : "published";
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next === "published" ? "Annonce publiée" : "Annonce repassée en brouillon");
      router.refresh();
    } catch {
      toast.error("Erreur", { description: "Impossible de modifier le statut." });
    } finally {
      setPendingId(null);
    }
  }

  async function remove(a: Announcement) {
    if (pendingId) return;
    if (!confirm(`Supprimer l'annonce « ${a.title} » ? Cette action est irréversible.`)) return;
    setPendingId(a.id);
    try {
      const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Annonce supprimée");
      router.refresh();
    } catch {
      toast.error("Erreur", { description: "Impossible de supprimer l'annonce." });
    } finally {
      setPendingId(null);
    }
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Aucune annonce pour le moment.{" "}
        <Link href={`/${slug}/admin/announcements/new`} className="text-primary underline">Créer la première annonce</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{a.title}</p>
              <Badge variant={a.status === "published" ? "default" : "outline"} className="text-xs">
                {a.status === "published" ? "Publiée" : "Brouillon"}
              </Badge>
              <Badge variant="secondary" className="text-xs">{audienceLabel(a.audience)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{a.content}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {new Date(a.created_at).toLocaleDateString("fr-FR")}
              {(a.creator as any)?.email ? ` · ${(a.creator as any).email}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => toggleStatus(a)}
              disabled={pendingId === a.id}
            >
              {pendingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : a.status === "published" ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {a.status === "published" ? "Dépublier" : "Publier"}
            </Button>
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link href={`/${slug}/admin/announcements/${a.id}/edit`}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:text-red-700"
              onClick={() => remove(a)}
              disabled={pendingId === a.id}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}