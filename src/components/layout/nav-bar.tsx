"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/dashboard/notification-bell";

export function NavBar({ schoolName, schoolSlug, logoUrl, primaryColor }: { schoolName: string; schoolSlug: string; logoUrl?: string | null; primaryColor?: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${schoolSlug}/login`);
  };

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-8 w-8 rounded object-cover" />
          ) : (
            <div
              className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor || '#3B82F6' }}
            >
              {schoolName.charAt(0)}
            </div>
          )}
          <h1 className="text-lg font-bold truncate">{schoolName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
