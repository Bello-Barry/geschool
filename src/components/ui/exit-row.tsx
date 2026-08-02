"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Animation de disparition douce (fade + collapse) d'une ligne.
 * Mesure la hauteur réelle puis réduit max-height/opacité en transition,
 * avant de déclencher onExited pour retirer l'élément du state.
 * 240ms, transform/opacity/max-height uniquement — léger pour mobile.
 */
export function ExitRow({
  removing,
  onExited,
  children,
  className,
}: {
  removing: boolean;
  onExited: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    if (!removing) return;

    const el = ref.current;
    const timer = setTimeout(() => onExitedRef.current(), 240);

    if (el) {
      el.style.maxHeight = `${el.scrollHeight}px`;
      el.offsetHeight; // force le reflow pour déclencher la transition
      el.style.maxHeight = "0px";
      el.style.opacity = "0";
      el.style.transform = "scale(0.98)";
      el.style.paddingTop = "0px";
      el.style.paddingBottom = "0px";
      el.style.marginTop = "0px";
      el.style.marginBottom = "0px";
    }

    return () => clearTimeout(timer);
  }, [removing]);

  return (
    <div
      ref={ref}
      aria-hidden={removing}
      className={cn(
        "overflow-hidden transition-[max-height,opacity,transform,padding,margin] duration-200 ease-in",
        className
      )}
    >
      {children}
    </div>
  );
}
