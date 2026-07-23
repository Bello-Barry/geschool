import { ReactNode } from "react";

function EmptyIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto mb-4"
      aria-hidden="true"
    >
      {/* Cercle extérieur */}
      <circle cx="60" cy="60" r="56" stroke="hsl(var(--border))" strokeWidth="2" fill="hsl(var(--muted))" />
      {/* Livre */}
      <rect x="38" y="48" width="44" height="34" rx="2" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <rect x="38" y="48" width="44" height="14" rx="2" fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      {/* Lignes sur la couverture */}
      <line x1="44" y1="56" x2="76" y2="56" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="61" x2="68" y2="61" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Point d'exclamation */}
      <circle cx="95" cy="30" r="12" fill="hsl(var(--primary)/0.12)" />
      <text x="95" y="34" textAnchor="middle" fill="hsl(var(--primary))" fontSize="14" fontWeight="bold">!</text>
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <EmptyIllustration />
      <h3 className="text-lg font-semibold mb-1 font-heading">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
