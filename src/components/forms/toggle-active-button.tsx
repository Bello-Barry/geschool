"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ToggleActiveButtonProps {
  userId: string;
  isActive: boolean;
}

export function ToggleActiveButton({ userId, isActive }: ToggleActiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!confirm(`Voulez-vous vraiment ${isActive ? "désactiver" : "activer"} ce compte ?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/toggle-active`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Erreur lors de la modification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : isActive ? "Désactiver" : "Activer"}
    </Button>
  );
}
