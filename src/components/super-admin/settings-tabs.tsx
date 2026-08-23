"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Database,
  Mail,
  BrainCircuit,
  Key,
  ShieldCheck,
  CheckCircle2,
  UserCog,
  FileText,
  ScrollText,
  Loader2,
} from "lucide-react";

export interface SettingsIntegrations {
  supabaseUrl: string;
  resend: boolean;
  gemini: boolean;
  deepseek: boolean;
}

export interface PlatformAdmin {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string | null;
}

export function SettingsTabs({
  integrations,
  superAdmins,
}: {
  integrations: SettingsIntegrations;
  superAdmins: PlatformAdmin[];
}) {
  return (
    <Tabs defaultValue="integrations" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="integrations">Intégrations</TabsTrigger>
        <TabsTrigger value="security">Sécurité &amp; Comptes</TabsTrigger>
        <TabsTrigger value="audit">Journal d'audit</TabsTrigger>
        <TabsTrigger value="billing">Facturation GESchool</TabsTrigger>
      </TabsList>

      <TabsContent value="integrations">
        <IntegrationsTab integrations={integrations} />
      </TabsContent>

      <TabsContent value="security">
        <SecurityTab superAdmins={superAdmins} />
      </TabsContent>

      <TabsContent value="audit">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-amber-500" /> Journal d'audit
            </CardTitle>
            <CardDescription>
              Traçabilité des actions des comptes plateforme (création/suppression d'école,activation/désactivation, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Espace réservé — le journal d'audit sera branché sur une table dédiée
              (super_admin_audit_log). À implémenter.
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="billing">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" /> Facturation GESchool
            </CardTitle>
            <CardDescription>
              Factures et relances émises aux écoles partenaires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Espace réservé — à brancher sur le kit commercial existant
              (conventions, factures proforma, relances dans <code>public/sales-kit/</code>).
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function IntegrationsTab({ integrations }: { integrations: SettingsIntegrations }) {
  const items = [
    {
      icon: <Database className="h-5 w-5 text-indigo-500" />,
      title: "Base de données (Supabase)",
      desc: "Connexion principale multi-tenant",
      ok: true,
      value: integrations.supabaseUrl,
      masked: true,
    },
    {
      icon: <Mail className="h-5 w-5 text-blue-500" />,
      title: "Service Email (Resend)",
      desc: "Envoi d'emails transactionnels",
      ok: integrations.resend,
      value: integrations.resend ? "Clé API configurée" : "Non configurée",
      masked: false,
    },
    {
      icon: <BrainCircuit className="h-5 w-5 text-purple-500" />,
      title: "Google Gemini",
      desc: "Modèle LLM — assistant éducatif",
      ok: integrations.gemini,
      value: integrations.gemini ? "Prêt" : "Non configuré",
      masked: false,
    },
    {
      icon: <BrainCircuit className="h-5 w-5 text-sky-500" />,
      title: "DeepSeek",
      desc: "Modèle LLM — assistant éducatif",
      ok: integrations.deepseek,
      value: integrations.deepseek ? "Prêt" : "Non configuré",
      masked: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((it) => (
        <Card key={it.title}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {it.icon}
              <CardTitle className="text-lg">{it.title}</CardTitle>
            </div>
            <CardDescription>{it.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Statut</span>
              </div>
              {it.ok ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {it.value}
                </Badge>
              ) : (
                <Badge variant="destructive">{it.value}</Badge>
              )}
            </div>
            {it.masked && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={it.value} disabled />
              </div>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Aucune clé sensible n'est affichée.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SecurityTab({ superAdmins }: { superAdmins: PlatformAdmin[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });

  async function createAccount() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la création");
      }
      toast.success("Compte plateforme créé");
      setOpen(false);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="h-5 w-5 text-red-500" /> Comptes plateforme (Super Admins)
          </CardTitle>
          <CardDescription>
            Liste des comptes racine GESchool — indépendants de toute école. Création et révocation ici.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserCog className="h-4 w-4" /> Créer un compte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un compte plateforme</DialogTitle>
              <DialogDescription>
                Le compte sera super_admin, sans école rattachée.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prénom</Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom</Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mot de passe (6+ caractères)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Annuler
              </Button>
              <Button onClick={createAccount} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4 font-semibold">Compte</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Créé le</th>
                <th className="py-3 px-4 font-semibold">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {superAdmins.map((a) => (
                <tr key={a.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">
                    {a.first_name} {a.last_name}
                  </td>
                  <td className="py-3 px-4">{a.email}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
                      Super Admin
                    </Badge>
                  </td>
                </tr>
              ))}
              {superAdmins.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Aucun compte plateforme.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
