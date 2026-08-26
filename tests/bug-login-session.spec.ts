import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const A_EMAIL = "bug-login-a@test.com";
const A_PW = "BugPass123!";
const B_EMAIL = "bug-login-b@test.com";
const B_PW = "BugPass123!";

async function purge() {
  for (const email of [A_EMAIL, B_EMAIL]) {
    const { data: users } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
    if (users) {
      await supabaseAdmin.from("users").delete().eq("id", users.id);
      await supabaseAdmin.auth.admin.deleteUser(users.id);
    }
  }
}

async function ensureUser(email: string, pw: string, role: string) {
  const { data: existing } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) return;
  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    user_metadata: { first_name: "Bug", last_name: "Test", role },
  });
  if (error) throw error;
  const { error: insErr } = await supabaseAdmin.from("users").insert({
    id: authData!.user!.id,
    email,
    role,
    first_name: "Bug",
    last_name: "Test",
    school_id: null,
  });
  if (insErr) throw insErr;
}

async function loginAs(page: any, email: string, password: string, expectPath: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('button[type="submit"]', { state: "attached" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${expectPath}**`, { timeout: 30000 });
  await page.waitForTimeout(800);
}

test.describe("Bug login session — ne jamais ignorer les identifiants saisis", () => {
  test.beforeAll(async () => {
    await purge();
    await ensureUser(A_EMAIL, A_PW, "super_admin");
    await ensureUser(B_EMAIL, B_PW, "super_admin");
  });

  test.afterAll(async () => {
    await purge();
  });

  // Scénario 2 : identifiants invalides sur /login alors qu'une session A existe
  // -> doit afficher une erreur, PAS rediriger vers le dashboard de A.
  test("Session A active + identifiants invalides => erreur, pas de redirection", async ({ page }) => {
    await loginAs(page, A_EMAIL, A_PW, "/super-admin");

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector('button[type="submit"]', { state: "attached" });

    // Le formulaire est bien affiché (pas auto-redirigé)
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.fill('input[type="email"]', A_EMAIL);
    await page.fill('input[type="password"]', "motdepassebidon123");
    await page.click('button[type="submit"]');

    // Doit rester sur /login avec un message d'erreur
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/incorrect|invalide/i)).toBeVisible();
  });

  // Scénario 1 : connecté en A, va sur /login, tape les identifiants de B
  // -> doit se connecter à B (changement de compte), pas rester sur A.
  test("Connecté en A + identifiants de B sur /login => bascule sur le compte B", async ({ page }) => {
    await loginAs(page, A_EMAIL, A_PW, "/super-admin");

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector('button[type="submit"]', { state: "attached" });

    // Le formulaire est affiché et on peut taper les identifiants de B
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.fill('input[type="email"]', B_EMAIL);
    await page.fill('input[type="password"]', B_PW);
    await page.click('button[type="submit"]');

    // Redirection vers le dashboard (B est super_admin -> /super-admin)
    await page.waitForURL("**/super-admin**", { timeout: 30000 });
    await page.waitForTimeout(800);

    // Preuve que c'est bien B : la bannière "déjà connecté" affiche l'email de B
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await expect(page.getByText(B_EMAIL)).toBeVisible();
    await expect(page.getByText(A_EMAIL)).toHaveCount(0);
  });

  // Scénario 3 : fermer/rouvrir l'app (session présente) -> /login affiche le
  // formulaire + bannière "déjà connecté", JAMAIS une redirection silencieuse.
  test("Session existante -> /login affiche le formulaire + bannière déjà connecté", async ({ page }) => {
    await loginAs(page, A_EMAIL, A_PW, "/super-admin");

    // Simule fermer/rouvrir : on revient simplement sur /login avec la session
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

    // Le formulaire est présent (pas auto-redirigé vers le dashboard)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // La bannière "déjà connecté" est présente
    await expect(page.getByText(/déjà connecté/i)).toBeVisible();
    await expect(page.getByText(A_EMAIL)).toBeVisible();
  });
});
