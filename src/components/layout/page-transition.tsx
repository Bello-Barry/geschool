"use client";

import { usePathname } from "next/navigation";

/**
 * Transition de page légère (fondu + slide) sur la navigation client-side.
 * Rejoue l'animation à chaque changement de route en remontant un wrapper
 * keyé par le pathname. Aucune librairie : CSS natif (transform/opacity),
 * 260ms, non-bloquant. Désactivé par prefers-reduced-motion (voir globals.css).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
