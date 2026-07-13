"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function NavBar({ schoolName, schoolSlug }: { schoolName: string; schoolSlug: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${schoolSlug}/login`);
  };

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold truncate">{schoolName}</h1>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}