"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, LayoutDashboard, GraduationCap, Users, UserCog, School, BookOpen, Link as LinkIcon, Calendar, CalendarRange, CreditCard, FileText, Settings, ClipboardList, MessageSquare, Bot } from "lucide-react";
import type { NavItem } from "@/lib/navigation";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, GraduationCap, Users, UserCog, School, BookOpen,
  Link: LinkIcon, Calendar, CalendarRange, CreditCard, FileText,
  Settings, ClipboardList, MessageSquare, Bot,
};

export function SidebarNav({ items, collapsed, onNavClick }: {
  items: NavItem[];
  collapsed?: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const schoolSlug = pathname.match(/^\/([^\/]+)/)?.[1] || "";

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => {
        const href = `/${schoolSlug}${item.href}`;
        const isDashboard = item.href === "/admin" || item.href === "/teacher" || item.href === "/parent" || item.href === "/student";
        const isActive = isDashboard ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
        const Icon = iconMap[item.icon] || LayoutDashboard;
        return (
          <Link key={item.href} href={href} onClick={onNavClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150 active:scale-[0.98] min-h-[44px]
              ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
