import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SUPER_EMAIL = "sa-phase1@test.com";
const SUPER_PW = "SuperPass123!";
const SCHOOL = "acct";
const SCHOOL_NAME = "Accountant School";

async function purgeTestData() {
  const { data: schools } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .ilike("subdomain", "acct%");
  for (const s of schools ?? []) {
    const { data: users } = await supabaseAdmin.from("users").select("id").eq("school_id", s.id);
    for (const u of users ?? []) {
      await supabaseAdmin.from("users").delete().eq("id", u.id);
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    await supabaseAdmin.from("schools").delete().eq("id", s.id);
  }
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .ilike("email", "cpt-%@test.com");
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

test.describe("Phase 1 — Rôle Comptable (accès strict)", () => {
  let schoolId: string;

  test.beforeAll(async () => {
    await purgeTestData();

    // 1. Compte super_admin de test
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

    // 2. École avec directeur existant
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({
        name: SCHOOL_NAME,
        subdomain: SCHOOL,
        code: SCHOOL.toUpperCase(),
        primary_color: "#0D9488",
        is_active: true,
      })
      .select("id")
      .single();
    expect(schoolError).toBeNull();
    schoolId = school!.id;

    // 3. Un directeur (admin_school) rattaché
    const { data: dirAuth } = await supabaseAdmin.auth.admin.createUser({
      email: "dir-acct@test.com",
      password: "DirPass123!",
      email_confirm: true,
      user_metadata: { first_name: "D", last_name: "Admin", role: "admin_school", school_id: schoolId },
    });
    const { error: dirUserError } = await supabaseAdmin.from("users").insert({
      id: dirAuth!.user!.id,
      school_id: schoolId,
      email: "dir-acct@test.com",
      role: "admin_school",
      first_name: "D",
      last_name: "Admin",
    });
    expect(dirUserError).toBeNull();
  });

  test.afterAll(async () => {
    await purgeTestData();
  });

  test("Le super-admin crée un comptable via la carte école", async ({ page }) => {
    await loginSuperAdmin(page);
    await page.goto(`${BASE}/super-admin/schools/${schoolId}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    await expect(page.locator("text=Comptables")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Aucun comptable rattaché")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer un comptable" })).toBeVisible();

    await page.getByRole("button", { name: "Créer un comptable" }).click();
    await page.waitForTimeout(400);

    await page.getByPlaceholder("Jean").fill("Comptable");
    await page.getByPlaceholder("Moukoko").fill("Un");
    await page.getByPlaceholder("comptable@ecole.com").fill(`cpt-${Date.now().toString(36)}@test.com`);
    await page.click("button:has-text('Créer le comptable')");

    await expect(page.locator("text=Compte créé avec succès")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#temp-password-field")).toBeVisible();
    const tempPassword = await page.locator("#temp-password-field").inputValue();
    expect(tempPassword.length).toBeGreaterThanOrEqual(6);

    await page.click("button:has-text(\"J'ai noté\")");
    await page.waitForTimeout(800);

    const { data: accts } = await supabaseAdmin
      .from("users")
      .select("email, role, school_id")
      .eq("school_id", schoolId)
      .eq("role", "accountant");
    expect(accts!.length).toBe(1);
    expect(accts![0].school_id).toBe(schoolId);

    // reconnect for display in detail
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await expect(page.locator("text=Comptable Un")).toBeVisible();
  });

  test("Le comptable se connecte → dashboard comptable (accès strict)", async ({ page }) => {
    // Récupérer le dernier comptable créé
    const { data: acct } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("school_id", schoolId)
      .eq("role", "accountant")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(acct).not.toBeNull();

    // Rejouer une création manuelle pour obtenir le mot de passe temporaire (même email)
    const email = acct!.email as string;
    const tempPassword = "CptPass123!";
    // Le compte existe déjà via l'UI test = on reset son mot de passe directement
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      (await supabaseAdmin.from("users").select("id").eq("email", email).single()).data!.id,
      { password: tempPassword }
    );
    expect(updateErr).toBeNull();

    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); });
    await page.context().clearCookies();
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector('button[type="submit"]', { state: "attached" });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`${SCHOOL}/accountant`), { timeout: 30000 });

    // Dashboard comptable : titres + KPIs
    await expect(page.locator("text=Espace Comptable")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Revenus total")).toBeVisible();
    await expect(page.locator("text=Tous les paiements")).toBeVisible();

    // Navigation stricte : le tableau de bord est actif, pas d'items admin
    await expect(page.locator("text=Élèves")).not.toBeVisible();
    await expect(page.locator("text=Enseignants")).not.toBeVisible();
  });

  test("Accès bloqué : le comptable ne peut pas atteindre /admin ou /teacher", async ({ page }) => {
    const { data: acct } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("school_id", schoolId)
      .eq("role", "accountant")
      .limit(1)
      .single();
    const tempPassword = "CptPass123!";

    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); });
    await page.context().clearCookies();
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector('button[type="submit"]', { state: "attached" });
    await page.fill('input[type="email"]', acct!.email);
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`${SCHOOL}/accountant`), { timeout: 30000 });

    // Tentatives d'accès aux zones de l'admin → redirection vers login
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(new RegExp(`${SCHOOL}/login`), { timeout: 20000 });
    await page.goto(`${BASE}/${SCHOOL}/teacher`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(new RegExp(`${SCHOOL}/login`), { timeout: 20000 });
  });

  test("La page paiements du comptable s'affiche en lecture seule", async ({ page }) => {
    const { data: acct } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("school_id", schoolId)
      .eq("role", "accountant")
      .limit(1)
      .single();
    const tempPassword = "CptPass123!";

    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); });
    await page.context().clearCookies();
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector('button[type="submit"]', { state: "attached" });
    await page.fill('input[type="email"]', acct!.email);
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`${SCHOOL}/accountant`), { timeout: 30000 });

    await page.goto(`${BASE}/${SCHOOL}/accountant/payments`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await expect(page.getByRole("heading", { name: "Paiements" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Consultation en lecture seule")).toBeVisible();
  });
});