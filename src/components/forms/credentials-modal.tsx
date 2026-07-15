"use client";

import { useState } from "react";
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
import { Copy, Check } from "lucide-react";

interface CredentialsModalProps {
  open: boolean;
  name: string;
  email: string;
  tempPassword: string;
  onConfirm: () => void;
}

export function CredentialsModal({ open, name, email, tempPassword, onConfirm }: CredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("temp-password-field") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compte créé avec succès</DialogTitle>
          <DialogDescription>
            Transmettez ces identifiants à {name} pour sa première connexion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email de connexion</label>
            <Input value={email} readOnly className="mt-1 bg-muted" />
          </div>

          <div>
            <label className="text-sm font-medium">Mot de passe temporaire</label>
            <div className="flex gap-2 mt-1">
              <Input id="temp-password-field" value={tempPassword} readOnly className="font-mono bg-muted" />
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copier le mot de passe">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Un email de bienvenue a également été envoyé à {email} avec ces informations.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onConfirm} className="w-full">
            J&apos;ai noté
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
