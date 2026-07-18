"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const typeColors: Record<string, string> = {
    info: "border-l-blue-500",
    warning: "border-l-yellow-500",
    success: "border-l-green-500",
    error: "border-l-red-500",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed md:absolute right-2 md:right-0 top-14 md:top-full md:mt-2 left-2 md:left-auto md:w-80 bg-card border rounded-lg shadow-lg z-50 max-h-[70vh] md:max-h-96 overflow-y-auto">
          <div className="p-3 border-b">
            <p className="text-sm font-semibold">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({unreadCount} non lue{unreadCount > 1 ? "s" : ""})
                </span>
              )}
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Aucune notification
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-l-4 ${typeColors[n.type] || "border-l-gray-300"} p-3 border-b hover:bg-muted/50 transition-colors ${n.is_read ? "opacity-60" : ""}`}
                >
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="block"
                      onClick={() => markAsRead(n.id)}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                    </Link>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => markAsRead(n.id)}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
