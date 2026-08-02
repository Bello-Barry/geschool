import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * StatusBadge — badge de statut unifié (Chantier 19, Phase 1).
 * Remplit les rôles de l'ancien stock de badges ad hoc (paiements, présence,
 * publications, activations). Fond = palette -100, texte = palette -700.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "border-transparent bg-success-100 text-success-700",
        warning: "border-transparent bg-warning-100 text-warning-700",
        danger: "border-transparent bg-danger-100 text-danger-700",
        info: "border-transparent bg-info-100 text-info-700",
        neutral: "border-transparent bg-neutral-100 text-neutral-700",
        outline: "border-neutral-300 bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Raccourci : mapping statut métier → variant. */
  status?: "paid" | "pending" | "rejected" | "confirmed" | "present" | "absent" | "late" | "excused" | "published" | "draft" | "active" | "inactive";
  label?: string;
}

const STATUS_TO_VARIANT: Record<NonNullable<StatusBadgeProps["status"]>, NonNullable<StatusBadgeProps["variant"]>> = {
  paid: "success",
  confirmed: "success",
  present: "success",
  active: "success",
  published: "info",
  pending: "warning",
  late: "warning",
  draft: "neutral",
  inactive: "neutral",
  rejected: "danger",
  absent: "danger",
  excused: "info",
};

const STATUS_TO_LABEL: Record<NonNullable<StatusBadgeProps["status"]>, string> = {
  paid: "Payé",
  confirmed: "Confirmé",
  present: "Présent",
  active: "Actif",
  published: "Publié",
  pending: "En attente",
  late: "Retard",
  draft: "Brouillon",
  inactive: "Inactif",
  rejected: "Rejeté",
  absent: "Absent",
  excused: "Excusé",
};

function StatusBadge({
  className,
  variant,
  status,
  label,
  children,
  ...props
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? (status ? STATUS_TO_VARIANT[status] : "neutral");
  return (
    <span
      className={cn(statusBadgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {children ?? label ?? (status ? STATUS_TO_LABEL[status] : null)}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants, STATUS_TO_LABEL, STATUS_TO_VARIANT }