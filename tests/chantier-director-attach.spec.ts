import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SUPER_EMAIL = "sa-phase0@test.com";
const SUPER_PW = "SuperPass123!";
const SCHOOL = "attdir";
const SCHOOL_NAME = "Attach Director";

async function purgeTestData() {
  // Supprime toutes les données de test (idempotent entre les runs)
  const { data: schools } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .ilike("subdomain", "attdir%");
  for (const s of schools ?? []) {
    await supabaseAdmin.from("classes").delete().eq("school_id", s.id);
    const { data: users } = await supabaseAdmin.from("users").select("id").eq("school_id", s.id);
    for (const u of users ?? []) {
      await supabaseAdmin.from("users").delete().eq("id", u.id);
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    await supabaseAdmin.from("schools").delete().eq("id", s.id);
  }
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id")
    .ilike("email", "dir%@test.com");
  for (const u of users ?? []) {
    await supabaseAdmin.from("users").delete().eq("id", u.id);
    await supabaseAdmin.auth.admin.deleteUser(u.id);
  }
  const { data: superUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", SUPER_EMAIL)
    .maybeSingle();
  if (superUser) {
    await supabaseAdmin.from("users").delete().eq("id", superUser.id);
    await supabaseAdmin.auth.admin.deleteUser(superUser.id);
  }
}

async function loginSuperAdmin(page: any) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); });
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('button[type="submit"]', { state: "attached" });
  await page.fill('input[type="email"]', SUPER_EMAIL);
  await page.fill('input[type="password"]', SUPER_PW);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/super-admin**", { timeout: 30000 });
  await page.waitForTimeout(1000);
}

test.describe("Phase 0 — Attacher un directeur depuis le super-admin", () => {
  test.beforeAll(async () => {
    await purgeTestData();

    // 1. Compte super_admin de test (détaché de toute école)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: SUPER_EMAIL,
      password: SUPER_PW,
      email_confirm: true,
      user_metadata: { first_name: "Super", last_name: "Admin", role: "super_admin" },
    });
    expect(authError).toBeNull();
    const { error: userError } = await supabaseAdmin.from("users").insert({
      id: authData!.user!.id,
      email: SUPER_EMAIL,
      role: "super_admin",
      first_name: "Super",
      last_name: "Admin",
      school_id: null,
    });
    expect(userError).toBeNull();

    // 2. École sans directeur
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({
        name: SCHOOL_NAME,
        subdomain: SCHOOL,
        code: SCHOOL.toUpperCase(),
        primary_color: "#4F46E5",
        is_active: true,
      })
      .select("id")
      .single();
    expect(schoolError).toBeNull();
    expect(school).not.toBeNull();
  });

  test.afterAll(async () => {
    await purgeTestData();
  });

  test("L'école sans directeur affiche le badge et le bouton Attacher un directeur", async ({ page }) => {
    await loginSuperAdmin(page);
    await page.goto(`${BASE}/super-admin/schools`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const schoolLink = page.getByRole("link", { name: new RegExp(SCHOOL_NAME) });
    await expect(schoolLink).toBeVisible({ timeout: 15000 });
    const row = page.locator("div.flex.justify-between").filter({ has: schoolLink });
    await expect(row.locator("text=Directeur à attacher")).toBeVisible();
    await expect(row.locator("text=Attacher un directeur")).toBeVisible();
  });

  test("Création du directeur : modale de credentials puis connexion directe", async ({ page }) => {
    await loginSuperAdmin(page);
    await page.goto(`${BASE}/super-admin/schools`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const schoolLink = page.getByRole("link", { name: new RegExp(SCHOOL_NAME) });
    const row = page.locator("div.flex.justify-between").filter({ has: schoolLink });
    await row.getByRole("button", { name: "Attacher un directeur" }).click();
    await page.waitForTimeout(500);

    await page.getByPlaceholder("Jean").fill("Pascal");
    await page.getByPlaceholder("Moukoko").fill("Nkoulou");
    await page.getByPlaceholder("directeur@ecole.com").fill(`dir-${Date.now().toString(36)}@test.com`);
    await page.click("button:has-text('Créer le directeur')");

    // Modale de credentials affichée avec le mot de passe temporaire
    await expect(page.locator("text=Compte créé avec succès")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#temp-password-field")).toBeVisible();
    const tempPassword = await page.locator("#temp-password-field").inputValue();
    expect(tempPassword.length).toBeGreaterThanOrEqual(6);

    await page.click("button:has-text(\"J'ai noté\")");
    await page.waitForTimeout(800);

    // Le compte existe avec le rôle admin_school
    const { data: dirs } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("role", "admin_school")
      .eq("school_id", (await supabaseAdmin.from("schools").select("id").eq("subdomain", SCHOOL).single()).data!.id);
    expect(dirs!.length).toBe(1);
    expect(dirs![0].email).toMatch(/^dir-/);

    // Le directeur créé est bien rattaché à l'école (school_id non nul)
    const { data: school } = await supabaseAdmin.from("schools").select("id").eq("subdomain", SCHOOL).single();
    const { data: dir } = await supabaseAdmin.from("users").select("id, role, school_id, first_name, last_name").eq("email", dirs![0].email).single();
    expect(dir!.role).toBe("admin_school");
    expect(dir!.school_id).toBe(school!.id);
    expect(dir!.first_name).toBe("Pascal");
    expect(dir!.last_name).toBe("Nkoulou");

    // Le directeur se connecte avec le mot de passe temporaire → atterrit sur /admin
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); });
    await page.context().clearCookies();
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', dirs![0].email);
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`${SCHOOL}/admin`), { timeout: 30000 });
  });

  test("Impossible d'attacher un second directeur à une école qui en a déjà un", async ({ page }) => {
    await loginSuperAdmin(page);
    await page.goto(`${BASE}/super-admin/schools`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const schoolLink = page.getByRole("link", { name: new RegExp(SCHOOL_NAME) });
    await expect(schoolLink).toBeVisible({ timeout: 15000 });
    const row = page.locator("div.flex.justify-between").filter({ has: schoolLink });
    await expect(row.locator("text=Directeur à attacher")).not.toBeVisible();
    await expect(row.locator("text=Attacher un directeur")).not.toBeVisible();
  });
});