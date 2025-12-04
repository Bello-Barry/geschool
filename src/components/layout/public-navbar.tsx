"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          GESchool
        </Link>
        <nav className="flex gap-4 items-center">
          <Link href="#features" className="text-sm hover:text-primary">
            Fonctionnalités
          </Link>
          <Link href="#stats" className="text-sm hover:text-primary">
            Statistiques
          </Link>
          <Button asChild variant="outline" className="mr-2">
            <Link href="#detect-school">Connexion</Link>
          </Button>
          <Button asChild>
            <Link href="/contact">Contact</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
