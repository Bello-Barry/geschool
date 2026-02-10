"use client";

import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
        <User className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}
