"use client";

import * as React from "react";
import { Divide, Infinity, Pi, Sigma, Subscript, Superscript } from "lucide-react";

type IconComponent = React.ComponentType<{ className?: string }>;

interface ToolbarButton {
  id: string;
  title: string;
  snippet: string;
  glyph?: string;
  icon?: IconComponent;
}

interface ToolbarGroup {
  label: string;
  buttons: ToolbarButton[];
}

const GROUPS: ToolbarGroup[] = [
  {
    label: "Structures",
    buttons: [
      { id: "frac", title: "Fraction", icon: Divide, snippet: "$\\frac{}{}$" },
      { id: "sqrt", title: "Racine carrée", glyph: "√", snippet: "$\\sqrt{}$" },
      { id: "nroot", title: "Racine n-ième", glyph: "ⁿ√", snippet: "$\\sqrt[n]{}$" },
      { id: "exp", title: "Exposant", icon: Superscript, snippet: "$x^{2}$" },
      { id: "sub", title: "Indice", icon: Subscript, snippet: "$x_{2}$" },
    ],
  },
  {
    label: "Lettres grecques",
    buttons: [
      { id: "pi", title: "Pi", icon: Pi, snippet: "$\\pi$" },
      { id: "alpha", title: "Alpha", glyph: "α", snippet: "$\\alpha$" },
      { id: "beta", title: "Bêta", glyph: "β", snippet: "$\\beta$" },
      { id: "delta", title: "Delta", glyph: "Δ", snippet: "$\\Delta$" },
      { id: "theta", title: "Thêta", glyph: "θ", snippet: "$\\theta$" },
    ],
  },
  {
    label: "Sommes et calculs",
    buttons: [
      { id: "sum", title: "Somme", icon: Sigma, snippet: "$\\sum_{n=1}^{\\infty}$" },
      { id: "int", title: "Intégrale", glyph: "∫", snippet: "$\\int_{a}^{b}$" },
      { id: "inf", title: "Infini", icon: Infinity, snippet: "$\\infty$" },
    ],
  },
  {
    label: "Comparaisons",
    buttons: [
      { id: "leq", title: "Inférieur ou égal", glyph: "≤", snippet: "$\\leq$" },
      { id: "geq", title: "Supérieur ou égal", glyph: "≥", snippet: "$\\geq$" },
      { id: "neq", title: "Différent de", glyph: "≠", snippet: "$\\neq$" },
      { id: "pm", title: "Plus ou moins", glyph: "±", snippet: "$\\pm$" },
      { id: "arrow", title: "Flèche", glyph: "→", snippet: "$\\rightarrow$" },
    ],
  },
];

interface MathToolbarProps {
  onInsert: (snippet: string) => void;
}

export function MathToolbar({ onInsert }: MathToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Barre de formules mathématiques"
      className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-1"
    >
      {GROUPS.map((group, gi) => (
        <React.Fragment key={group.label}>
          {gi > 0 && <span aria-hidden className="mx-1 h-8 w-px bg-border" />}
          {group.buttons.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.id}
                type="button"
                title={b.title}
                aria-label={b.title}
                onClick={() => onInsert(b.snippet)}
                className="flex h-11 min-w-11 items-center justify-center rounded-md border border-transparent px-1 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Icon ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <span className="text-base leading-none">{b.glyph}</span>
                )}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
