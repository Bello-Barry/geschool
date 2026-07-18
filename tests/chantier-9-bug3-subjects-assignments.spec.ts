import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Bug 3 — Subjects CRUD + Assignment", () => {
  test.setTimeout(180000);

  test("create subject, then create assignment without Zod error", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "bug3-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;

    // Register
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const regResult = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Test School", subdomain: SCHOOL },
    });
    expect(regResult.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "load" });

    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year
    const { data: yd } = await supabaseAdmin
      .from("academic_years")
      .insert({ school_id: schoolId, name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true })
      .select("id")
      .single();
    expect(yd).not.toBeNull();

    // Create class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6eme A", level: "6eme", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();

    // Create teacher
    const T_EMAIL = `t-${rand}@test.com`;
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, { url: `${BASE}/api/teachers`, data: { first_name: "Paul", last_name: "Prof", email: T_EMAIL, specialization: "Maths" } });
    expect(td.id).toBeDefined();

    // ---- TEST: Create subject via the new subject page ----
    await page.goto(`${BASE}/${SCHOOL}/admin/subjects/new`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    await page.fill('input[placeholder="Mathématiques"]', "Mathematiques");
    await page.fill('input[placeholder="MATH"]', "MATH");
    await page.fill('input[type="number"]', "4");
    await page.click('button:has-text("Créer la matière")');
    await page.waitForTimeout(3000);

    // Should redirect to subjects list
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/admin/subjects");
    await expect(page.locator("text=Mathematiques").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Subject created and appears in list");

    // ---- TEST: Create assignment now ----
    await page.goto(`${BASE}/${SCHOOL}/admin/assignments/new`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    // Select teacher via shadcn Select
    await page.locator('button').filter({ hasText: 'Sélectionner un enseignant' }).click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').filter({ hasText: 'Paul Prof' }).click();
    await page.waitForTimeout(500);

    // Select subject (now populated)
    await page.locator('button').filter({ hasText: 'Sélectionner une matière' }).click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').filter({ hasText: 'Mathematiques' }).click();
    await page.waitForTimeout(500);

    // Select class
    await page.locator('button').filter({ hasText: 'Sélectionner une classe' }).click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').filter({ hasText: '6eme A' }).click();
    await page.waitForTimeout(500);

    // Submit
    await page.click('button:has-text("Créer l\'affectation")');
    await page.waitForTimeout(3000);

    // Should redirect to assignments list — no error
    expect(page.url()).toContain("/admin/assignments");
    console.log("OK Assignment created without Zod error");
  });
});
