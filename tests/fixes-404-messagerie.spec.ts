import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Fixes — 404 routes + grade save [object Object]", () => {
  test.setTimeout(180000);

  test("teacher classes + parent grades pages load without 404", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "fix-" + rand;
    const ADMIN_EMAIL = `af-${rand}@test.com`;
    const TEACHER_EMAIL = `tf-${rand}@test.com`;
    const STUDENT_EMAIL = `sf-${rand}@test.com`;
    const PARENT_EMAIL = `pf-${rand}@test.com`;

    // Register school
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Fix", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Fix School", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year + term
    const { data: yd } = await supabaseAdmin
      .from("academic_years")
      .insert({ school_id: schoolId, name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true })
      .select("id")
      .single();

    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: yd!.id, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2025-12-20", is_current: true })
      .select("id")
      .single();

    // Create class, subject
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6eme A", level: "6eme", academic_year_id: yd!.id, capacity: 30 } });

    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Maths", code: "MA", coefficient: 4 })
      .select("id")
      .single();

    // Create teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Paul", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });
    expect(td.id).toBeDefined();
    const teacherPw = td.tempPassword;

    // Assign teacher
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: td.id, subject_id: subject!.id, class_id: cd.id } });

    // Create student
    const std = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Marie", last_name: "Eleve", email: STUDENT_EMAIL, class_id: cd.id, gender: "F" },
    });

    // Create parent and link
    const pd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Maman", last_name: "Test", email: PARENT_EMAIL, student_id: std.id },
    });

    // Clear admin session
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ===== Login as teacher =====
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', teacherPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // ===== TEST: teacher/classes loads without 404 =====
    const classesResp = await page.goto(`${BASE}/${SCHOOL}/teacher/classes`, { waitUntil: "load" });
    expect(classesResp?.status()).not.toBe(404);
    await expect(page.locator("text=Mes classes").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Maths").first()).toBeVisible({ timeout: 5000 });
    console.log("OK teacher/classes loads with content");

    // ===== TEST: Grade entry save still works (no [object Object]) =====
    await page.goto(`${BASE}/${SCHOOL}/teacher/grades/${cd.id}/${subject!.id}`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Saisie des notes").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Marie").first()).toBeVisible({ timeout: 5000 });

    // Enter only Interro=10 + Compo=17 (no Devoir) to test partial save
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(1).fill("10");
    await page.waitForTimeout(300);
    await inputs.nth(2).fill("17");
    await page.waitForTimeout(300);

    // Verify average: (0 + 10 + 17*2) / 4 = 44/4 = 11.00
    await expect(page.locator("text=11.00").first()).toBeVisible({ timeout: 3000 });

    // Save
    await page.locator("button").filter({ hasText: "Sauvegarder tout" }).click();
    await page.waitForTimeout(2000);

    // Should show success, NOT [object Object]
    await expect(page.locator("text=Notes sauvegardées avec succès").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Grade save works (no [object Object])");

    // ===== Login as parent =====
    // Clear teacher session
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[type="password"]', pd.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // ===== TEST: parent/children/[id]/grades loads without 404 =====
    const gradesResp = await page.goto(`${BASE}/${SCHOOL}/parent/children/${std.id}/grades`, { waitUntil: "load" });
    expect(gradesResp?.status()).not.toBe(404);
    // Check page loads with either the heading or no 404 error text
    const has404 = await page.locator("text=404").first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(has404).toBe(false);
    console.log("OK parent/children/[id]/grades loads without 404");
  });
});
