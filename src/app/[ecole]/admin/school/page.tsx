"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, Upload, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function SchoolSettingsPage() {
  const { ecole } = useParams<{ ecole: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    logo_url: "",
    logoPreview: "",
    primary_color: "#3B82F6",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    fetch(`/api/schools`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setForm({
            name: data.name || "",
            logo_url: data.logo_url || "",
            logoPreview: data.logo_url || "",
            primary_color: data.primary_color || "#3B82F6",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ecole]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Format non supporté", description: "Utilisez PNG, JPEG ou WebP.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Taille maximum : 2 Mo.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, logoPreview: localPreview }));
    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/schools/logo", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur d'upload");
      }

      const { logo_url } = await res.json();
      setForm((f) => ({ ...f, logo_url }));
      toast({ title: "Logo uploadé", description: "Le logo a été mis à jour." });
    } catch (err) {
      setForm((f) => ({ ...f, logoPreview: f.logo_url }));
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Échec de l'upload", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setForm((f) => ({ ...f, logo_url: "", logoPreview: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          logo_url: form.logo_url || null,
          primary_color: form.primary_color || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur de sauvegarde");
      }

      toast({ title: "Paramètres mis à jour", description: "Les informations de l'école ont été sauvegardées." });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Échec de la sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Paramètres de l&apos;école</h1>
        <p className="text-gray-600 mt-2">Modifiez les informations de votre établissement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Nom, logo et couleur principale de l&apos;école</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nom de l&apos;école</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium">Logo de l&apos;école</label>
            <div className="flex items-start gap-4 mt-1">
              <div className="h-20 w-20 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logoPreview ? (
                  <img src={form.logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {form.logoPreview ? "Changer" : "Choisir"}
                  </Button>
                  {form.logoPreview && (
                    <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">PNG, JPEG ou WebP. 2 Mo max.</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Couleur principale</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-32" />
              <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: form.primary_color }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>Téléphone, email et adresse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Téléphone</label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+242 06 123 4567" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contact@ecole.cg" />
          </div>
          <div>
            <label className="text-sm font-medium">Adresse</label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Brazzaville, Congo" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
