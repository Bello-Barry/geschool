"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  FileText,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { icon: LayoutDashboard, label: "Tableau de Bord", href: "/admin" },
    { icon: GraduationCap, label: "Élèves", href: "/admin/students" },
    { icon: Users, label: "Enseignants", href: "/admin/teachers" },
    { icon: School, label: "Classes", href: "/admin/classes" },
    { icon: FileText, label: "Notes", href: "/admin/grades" },
    { icon: Calendar, label: "Présences", href: "/admin/attendance" },
    { icon: Settings, label: "Paramètres", href: "/admin/settings" },
  ];

  return (
    <aside className={`h-full bg-card border-r flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center justify-between">
        {!collapsed && <h2 className="text-xl font-bold text-primary truncate">GESchool</h2>}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t">
          <div className="bg-primary/5 p-4 rounded-lg">
            <p className="text-xs font-semibold text-primary uppercase mb-1">Besoin d'aide ?</p>
            <p className="text-xs text-muted-foreground">Consultez notre guide d'utilisation.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
