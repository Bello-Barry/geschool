"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";

export interface SchoolDetailNavItem {
  id: string;
  name: string;
}

export function SchoolDetailNav({ schools }: { schools: SchoolDetailNavItem[] }) {
  const router = useRouter();

  if (schools.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-2 ml-3 pl-3 border-l border-border">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="relative">
        <select
          aria-label="Accéder au détail d'une école"
          className="appearance-none h-9 rounded-md border bg-background pl-2 pr-7 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          defaultValue=""
          onChange={(e) => {
            const value = e.target.value;
            if (value) router.push(`/super-admin/schools/${value}`);
          }}
        >
          <option value="">Plateforme (global)</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
