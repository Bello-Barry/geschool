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

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const schoolSlug = pathname.match(/^\/([^\/]+)/)?.[1] || "";

  const primaryItems = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {primaryItems.map((item) => {
          const href = `/${schoolSlug}${item.href}`;
          const isDashboard = item.href === "/admin" || item.href === "/teacher" || item.href === "/parent" || item.href === "/student";
          const isActive = isDashboard ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
          const Icon = iconMap[item.icon] || LayoutDashboard;
          return (
            <Link key={item.href} href={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full px-1 transition-transform active:scale-95
                ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium truncate max-w-full text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
