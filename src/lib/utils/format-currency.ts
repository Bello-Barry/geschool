/**
 * Formate un montant en Franc CFA.
 * Sortie attendue : "12 000 FCFA" (séparateur de milliers = espace, jamais de virgule, jamais "₣").
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "0 FCFA";

  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${sign}${grouped} FCFA`;
}
