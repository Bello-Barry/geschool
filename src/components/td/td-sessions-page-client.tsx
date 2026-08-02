"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Eye, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { ListSkeleton } from "@/components/ui/skeletons";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TdSession {
  id: string;
  type: "td" | "tp";
  title: string;
  session_date: string;
  status: string;
  description: string | null;
  subject: { name: string } | null;
  class: { name: string } | null;
  created_at: string;
}

interface Props {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}

export function TdSessionsPageClient({ classes, subjects }: Props) {
  const params = useParams();
  const ecole = params?.ecole as string;
  const [sessions, setSessions] = useState<TdSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "td" as "td" | "tp",
    subject_id: "",
    class_id: "",
    session_date: "",
    description: "",
    status: "draft" as "draft" | "published",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/td");
    if (res.ok) {
      const json = await res.json();
      setSessions(json.data || []);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/td");
    if (res.ok) {
      const json = await res.json();
      setSessions(json.data || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/td", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ title: "", type: "td", subject_id: "", class_id: "", session_date: "", description: "", status: "draft" });
      load();
    } else {
      const json = await res.json();
      alert(json.error || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/td/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const statusBadge = (status: string) => {
    if (status === "published") return <StatusBadge status="published" />;
    return <StatusBadge status="draft" />;
  };

  return (
    <div className="container mx-auto p-6">
      <PullToRefresh onRefresh={refresh}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">TD/TP</h1>
            <p className="text-muted-foreground">Gérez vos séances de travaux dirigés et pratiques</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle séance</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle séance TD/TP</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titre</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: TD N°3 - Équations" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as "td" | "tp" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="td">TD</SelectItem>
                    <SelectItem value="tp">TP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Matière</Label>
                  <Select value={form.subject_id} onValueChange={v => setForm(p => ({ ...p, subject_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Classe</Label>
                  <Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Date de la séance</Label>
                <Input type="date" value={form.session_date} onChange={e => setForm(p => ({ ...p, session_date: e.target.value }))} />
              </div>
              <div>
                <Label>Description (optionnelle)</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as "draft" | "published" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer la séance
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune séance TD/TP pour le moment</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Créer la première séance
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {session.subject?.name} • {session.class?.name} • {new Date(session.session_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(session.status)}
                    <Badge variant="secondary">{session.type.toUpperCase()}</Badge>
                  </div>
                </div>
              </CardHeader>
              {session.description && (
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">{session.description}</p>
                </CardContent>
              )}
              <CardContent className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${ecole}/teacher/td/${session.id}`}><Eye className="mr-1 h-4 w-4" />Détails</Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-4 w-4" />Supprimer</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(session.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </PullToRefresh>
    </div>
  );
}