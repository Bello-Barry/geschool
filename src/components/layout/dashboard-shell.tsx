"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import { PageTransition } from "./page-transition";
import { OfflineBanner } from "./offline-banner";
import { navItemsByRole } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";

export function DashboardShell({
  children,
  role,
  schoolName,
  schoolSlug,
  logoUrl,
  primaryColor,
  fullWidth = false,
}: {
  children: React.ReactNode;
  role: string;
  schoolName: string;
  schoolSlug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  fullWidth?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const navItems: NavItem[] = (navItemsByRole[role] || navItemsByRole.admin_school) as NavItem[];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(schoolSlug ? `/${schoolSlug}/login` : "/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 md:hidden -ml-1" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="flex items-center gap-3 px-6 h-16 border-b shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt={schoolName} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: primaryColor || "#3B82F6" }}
                    >
                      {schoolName.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold truncate">{schoolName}</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <SidebarNav items={navItems} onNavClick={() => setMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {logoUrl ? (
              <img src={logoUrl} alt={schoolName} className="h-7 w-7 rounded object-cover hidden sm:block" />
            ) : (
              <div
                className="h-7 w-7 rounded flex items-center justify-center text-white font-bold text-xs shrink-0 hidden sm:flex"
                style={{ backgroundColor: primaryColor || "#3B82F6" }}
              >
                {schoolName.charAt(0)}
              </div>
            )}
            <h1 className="text-base font-bold truncate max-w-[180px] sm:max-w-none">{schoolName}</h1>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion" className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-14 border-r bg-card z-30">
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <SidebarNav items={navItems} />
        </div>
      </aside>

      {/* Offline banner */}
      <OfflineBanner />

      {/* Main content */}
      <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] md:pl-64 pb-20 md:pb-8 min-h-screen">
        {fullWidth ? (
          <PageTransition>{children}</PageTransition>
        ) : (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
            <PageTransition>{children}</PageTransition>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav items={navItems} />
    </div>
  );
}
