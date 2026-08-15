"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ShieldAlert, Loader2, MoreVertical } from "lucide-react";

interface UserActionsProps {
  userId: string;
  isActive: boolean;
  onViewProfile?: () => void;
}

export function UserActions({ userId, isActive, onViewProfile }: UserActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggleActive() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/toggle-active`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success(isActive ? "Compte désactivé" : "Compte réactivé");
      router.refresh();
    } catch {
      toast.error("Erreur", { description: "Impossible de modifier le statut du compte." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer" onClick={onViewProfile} disabled={!onViewProfile}>
          <User className="mr-2 h-4 w-4" /> Profil détaillé
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={toggleActive}
          disabled={loading}
        >
          <ShieldAlert className="mr-2 h-4 w-4" />
          {isActive !== false ? "Désactiver le compte" : "Réactiver le compte"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
