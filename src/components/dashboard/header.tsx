"use client";

import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
