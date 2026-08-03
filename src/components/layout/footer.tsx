"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} GESchool — Gérer, Apprendre, Réussir.
        </p>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/mentions-legales" className="hover:text-primary">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-primary">
            Confidentialité
          </Link>
          <Link href="/conditions" className="hover:text-primary">
            Conditions
          </Link>
          <a href="mailto:info@geschool.cd" className="hover:text-primary">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
