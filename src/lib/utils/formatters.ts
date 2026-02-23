/**
 * Formate un montant en Franc CFA
 */
export function formatCFA(amount: number): string {
    return new Intl.NumberFormat('fr-CG', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
    }).format(amount).replace('FCFA', '₣');
}

/**
 * Formate une date en format français (jj/mm/aaaa)
 */
export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d);
}

/**
 * Formate un pourcentage
 */
export function formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'percent',
        minimumFractionDigits: 1,
    }).format(value / 100);
}

/**
 * Tronque un texte avec des points de suspension
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
}
