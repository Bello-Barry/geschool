import { pdf, renderToBuffer } from '@react-pdf/renderer';

/**
 * Génère un Blob PDF à partir d'un composant React-PDF (usage client)
 */
export async function generatePDFBlob(component: React.ReactElement): Promise<Blob> {
    const instance = pdf(component as any);
    return await instance.toBlob();
}

/**
 * Génère un Buffer PDF à partir d'un composant React-PDF (usage serveur)
 */
export async function generatePDFBuffer(document: React.ReactElement): Promise<Buffer> {
    return await renderToBuffer(document as React.ReactElement<any>);
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
