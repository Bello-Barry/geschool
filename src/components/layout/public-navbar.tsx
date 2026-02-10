"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Header() {
  const NavItems = () => (
    <>
      <Link href="/#features" className="text-sm font-medium hover:text-primary transition-colors">
        Fonctionnalités
      </Link>
      <Link href="/#stats" className="text-sm font-medium hover:text-primary transition-colors">
        Statistiques
      </Link>
    </>
  );

  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary text-3xl">GE</span>School
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8 items-center">
          <NavItems />
          <div className="flex gap-2 items-center border-l pl-8 ml-4">
            <Button asChild variant="ghost">
              <Link href="/#detect-school">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/register">S'inscrire</Link>
            </Button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-4">
          <Button asChild size="sm" variant="outline">
            <Link href="/#detect-school">Connexion</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-8">
                <NavItems />
                <hr />
                <Button asChild className="w-full">
                  <Link href="/register">Créer mon établissement</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
