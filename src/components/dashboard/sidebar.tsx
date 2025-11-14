"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const [open, setOpen] = useState(true);

  return (
    <aside className={`bg-background border-r transition-all duration-300 ${open ? 'w-64' : 'w-20'}`}>
      <div className="p-4 flex items-center justify-between">
        {open && <h2 className="text-lg font-bold">GESchool</h2>}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="space-y-2 p-4">
        <Link href="/dashboard" className="block px-4 py-2 rounded-lg hover:bg-muted">
          {open && <span>Tableau de Bord</span>}
        </Link>
        <Link href="/dashboard/students" className="block px-4 py-2 rounded-lg hover:bg-muted">
          {open && <span>Élèves</span>}
        </Link>
        <Link href="/dashboard/teachers" className="block px-4 py-2 rounded-lg hover:bg-muted">
          {open && <span>Enseignants</span>}
        </Link>
        <Link href="/dashboard/classes" className="block px-4 py-2 rounded-lg hover:bg-muted">
          {open && <span>Classes</span>}
        </Link>
        <Link href="/dashboard/grades" className="block px-4 py-2 rounded-lg hover:bg-muted">
          {open && <span>Notes</span>}
        </Link>
        <Link href="/dashboard/attendance" className="block px-4 py-2 rounded-lg hover:bg-muted">
          {open && <span>Présences</span>}
        </Link>
      </nav>
    </aside>
  );
}
