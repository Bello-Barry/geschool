import { pdf } from '@react-pdf/renderer';

/**
 * Génère un Blob PDF à partir d'un composant React-PDF
 */
export async function generatePDFBlob(component: React.ReactElement): Promise<Blob> {
    const instance = pdf(component as any);
    return await instance.toBlob();
}

/**
 * Déclenche le téléchargement d'un fichier
 */
export function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
