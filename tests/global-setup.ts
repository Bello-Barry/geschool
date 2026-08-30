import { FullConfig } from "@playwright/test";

/**
 * Pré-vérification réseau : attend que Supabase soit joignable avant de lancer
 * les tests. Absorbe les micro-coupures du hotspot sans faire échouer tout le run.
 */
async function waitForSupabase(timeoutMs = 120000) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wvxahcvyejsxmlrirhdr.supabase.co";
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, { method: "GET" });
      if (res.status === 401 || res.status === 200) {
        console.log("[global-setup] Supabase joignable.");
        return;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("[global-setup] Supabase injoignable après le délai imparti.");
}

export default async function globalSetup(_config: FullConfig) {
  await waitForSupabase();
}
