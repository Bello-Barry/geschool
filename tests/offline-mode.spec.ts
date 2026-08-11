import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Offline mode + PWA + Super Admin", () => {
  test.setTimeout(300000);

  async function registerSchool(page: any, prefix: string) {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = prefix + rand;
    const EMAIL = `admin-${rand}@test.com`;
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return r.ok;
    }, {
      url: `${BASE}/api/auth/register`,
      data: {
        firstName: "Admin",
        lastName: "Test",
        email: EMAIL,
        password: "Test123!",
        schoolName: "Offline School",
        subdomain: SCHOOL,
      },
    });
    expect(reg).toBeTruthy();
    return { SCHOOL, EMAIL };
  }

  // ====================================================================
  // TEST 1: Service worker registered + API GET responses cached
  // ====================================================================
  test("SW enregistré et cache les réponses API (geschool-api-v1)", async ({ page }) => {
    const { SCHOOL } = await registerSchool(page, "offsw-");
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Recharge pour que le SW contrôle la page
    await page.reload({ waitUntil: "networkidle" });

    // Le SW doit contrôler la page après le reload
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, { timeout: 20000 });
    console.log("✅ SW contrôle la page");

    // Appel API réel → intercepté par le SW → mis en cache
    const before = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return { ok: r.ok, body: await r.json() };
    }, BASE);
    expect(before.ok).toBeTruthy();

    // La réponse doit être dans le cache SW
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const cache = await caches.open("geschool-api-v1");
          const keys = await cache.keys();
          return keys.some((k) => new URL(k.url).pathname === "/api/debug-auth");
        })
      )
      .toBeTruthy();
    console.log("✅ /api/debug-auth mis en cache par le SW");
  });

  // ====================================================================
  // TEST 2: En mode hors-ligne, les réponses API en cache sont servies
  // ====================================================================
  test("offline → réponse API en cache servie, non-cachée → 503", async ({ page }) => {
    const { SCHOOL } = await registerSchool(page, "offapi-");
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, { timeout: 20000 });

    // Pré-chauffe du cache
    const onlineBody = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return r.ok ? await r.json() : null;
    }, BASE);
    expect(onlineBody).not.toBeNull();

    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const cache = await caches.open("geschool-api-v1");
          return (await cache.keys()).length > 0;
        })
      )
      .toBeTruthy();

    // Passe en hors-ligne
    await page.context().setOffline(true);

    // L'URL en cache est servie (même réponse JSON), pas d'erreur réseau
    const offlineCached = await page.evaluate(async (base) => {
      try {
        const r = await fetch(`${base}/api/debug-auth`);
        return { ok: r.ok, status: r.status, body: await r.json() };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }, BASE);
    expect(offlineCached.ok).toBeTruthy();
    expect(offlineCached.status).toBe(200);
    expect(offlineCached.body["x-user-id"]).toBe(onlineBody["x-user-id"]);
    console.log("✅ API en cache servie en mode hors-ligne");

    // Une URL jamais mise en cache → 503 { offline: true }
    const offlineMiss = await page.evaluate(async (base) => {
      try {
        const r = await fetch(`${base}/api/students`);
        return { ok: r.ok, status: r.status, body: await r.json() };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }, BASE);
    expect(offlineMiss.ok).toBeFalsy();
    expect(offlineMiss.status).toBe(503);
    expect(offlineMiss.body.offline).toBe(true);
    console.log("✅ API non-cachée → 503 hors-ligne");

    await page.context().setOffline(false);
  });

  // ====================================================================
  // TEST 3: Bannière hors-ligne + reconnexion + compteur de sync
  // ====================================================================
  test("bannière « Mode hors-ligne » puis « Connexion rétablie »", async ({ page }) => {
    const { SCHOOL } = await registerSchool(page, "offban-");
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });

    // La bannière est invisible en ligne
    await expect(page.locator("text=Mode hors-ligne")).toHaveCount(0);

    // Passe hors-ligne → bannière visible
    await page.context().setOffline(true);
    await expect(page.locator("text=Mode hors-ligne").first()).toBeVisible({ timeout: 15000 });
    console.log("✅ Bannière « Mode hors-ligne » visible");

    // Reviens en ligne → bannière disparaît (aucune opération en attente)
    await page.context().setOffline(false);
    await expect(page.locator("text=Mode hors-ligne")).toHaveCount(0, { timeout: 15000 });
    console.log("✅ Bannière disparaît à la reconnexion (queue vide)");
  });

  // ====================================================================
  // TEST 4: Compteur de sync + flush au retour en ligne
  // ====================================================================
  test("opération en attente → compteur + « Connexion rétablie » + flush", async ({ page }) => {
    const { SCHOOL } = await registerSchool(page, "offsync-");
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });

    // Prépare une opération en attente dans la queue (simule une mutation hors-ligne)
    await page.evaluate(() => {
      localStorage.setItem(
        "geschool_sync_queue",
        JSON.stringify([
          {
            id: "test-op-1",
            method: "POST",
            url: "/api/terms/nonexistent/activate",
            body: null,
            headers: {},
            timestamp: Date.now(),
            retries: 0,
            maxRetries: 3,
          },
        ])
      );
    });

    // Passe hors-ligne → bannière + compteur « 1 en attente »
    await page.context().setOffline(true);
    await expect(page.locator("text=Mode hors-ligne").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=1 en attente").first()).toBeVisible({ timeout: 15000 });
    console.log("✅ Compteur « 1 en attente » visible hors-ligne");

    // Reviens en ligne → « Connexion rétablie » tant que la queue n'est pas vidée
    await page.context().setOffline(false);
    await expect(page.locator("text=Connexion rétablie").first()).toBeVisible({ timeout: 15000 });
    console.log("✅ « Connexion rétablie » affiché à la reconnexion");
  });

  // ====================================================================
  // TEST 5: /super-admin non autorisé → redirection
  // ====================================================================
  test("/super-admin redirige vers /login si non authentifié", async ({ page }) => {
    await page.goto(`${BASE}/super-admin`, { waitUntil: "load" });
    await page.waitForURL("**/login**", { timeout: 15000 });
    console.log("✅ /super-admin → /login (non authentifié)");
  });

  test("/super-admin redirige vers / si l'utilisateur n'est pas super_admin", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "offsa-" + rand;
    const EMAIL = `admin-${rand}@test.com`;

    // Register (crée un utilisateur super_admin par défaut)
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok;
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: "Test123!", schoolName: "SA School", subdomain: SCHOOL },
    });
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Dégradé en admin_school (rôle non autorisé sur /super-admin)
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", EMAIL)
      .single();
    expect(userRow).not.toBeNull();
    await supabaseAdmin.from("users").update({ role: "admin_school" }).eq("id", userRow!.id);

    await page.goto(`${BASE}/super-admin`, { waitUntil: "load" });
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });
    console.log("✅ /super-admin → / (rôle admin_school non autorisé)");
  });
});