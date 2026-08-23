"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { CredentialsModal } from "@/components/forms/credentials-modal";

interface AttachDirectorDialogProps {
  schoolId: string;
  schoolName: string;
  onAttached?: () => void;
}

export function AttachDirectorDialog({ schoolId, schoolName, onAttached }: AttachDirectorDialogProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const router = useRouter();

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const onSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Prénom, nom et email sont requis.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Adresse email invalide.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/director`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error && typeof data.error === "object"
              ? Object.values(data.error as Record<string, unknown>).flat().join(", ")
              : "Erreur lors de la création du directeur";
        throw new Error(msg);
      }

      setCredentials({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: data.email,
        tempPassword: data.tempPassword,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du directeur.");
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsConfirmed = () => {
    setCredentials(null);
    setOpen(false);
    resetForm();
    toast.success("Directeur rattaché", {
      description: `${schoolName} a maintenant un directeur.`,
    });
    router.refresh();
    onAttached?.();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Attacher un directeur
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && !loading && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attacher un directeur</DialogTitle>
            <DialogDescription>
              Crée le compte administrateur (directeur) de <strong>{schoolName}</strong>. Un mot de passe temporaire
              sera généré.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <Input placeholder="Jean" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Nom</label>
                <Input placeholder="Moukoko" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="directeur@ecole.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={onSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le directeur"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CredentialsModal
        open={credentials !== null}
        name={credentials?.name || ""}
        email={credentials?.email || ""}
        tempPassword={credentials?.tempPassword || ""}
        onConfirm={handleCredentialsConfirmed}
      />
    </>
  );
}