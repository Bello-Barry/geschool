"use client";

import { useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;

/**
 * Geste natif "pull-to-refresh" pour les listes principales sur mobile.
 * Tire vers le bas quand la page est en haut : indicateur + rafraîchissement.
 * Léger (touch events + transition CSS uniquement), ignoré sur desktop
 * (souris) et désactivé par prefers-reduced-motion (globals.css).
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}) {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      const touch = e.touches[0];
      if (touch) startY.current = touch.clientY;
    } else {
      startY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const touch = e.touches[0];
    if (!touch) return;
    const delta = touch.clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      pulling.current = true;
      setPull(Math.min(delta * 0.45, 110));
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;
    startY.current = null;

    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const height = refreshing ? 44 : pull;

  return (
    <div
      className={cn("select-none", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height }}
        aria-hidden={height === 0}
      >
        {height > 0 && (
          <RefreshCw
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              (refreshing || pull >= THRESHOLD) && "animate-spin"
            )}
          />
        )}
      </div>
      {children}
    </div>
  );
}
