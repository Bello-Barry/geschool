import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Bug 4 — Grade entry: moyenne + save button", () => {
  test.setTimeout(180000);

  test("enter grades, verify dynamic average, save, persist", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "bug4-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;
    const STUDENT_EMAIL = `s-${rand}@test.com`;

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
    await page.waitForTimeout(1000);

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

    // Create term
    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: yd.id, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2025-12-20", is_current: true })
      .select("id")
      .single();
    expect(term).not.toBeNull();

    // Create class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6eme A", level: "6eme", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();

    // Create subject
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Français", code: "FR", coefficient: 4 })
      .select("id")
      .single();
    expect(subject).not.toBeNull();

    // Create teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Testeur", email: TEACHER_EMAIL, specialization: "Français" },
    });
    expect(td.id).toBeDefined();
    const teacherId = td.id;
    const teacherPw = td.tempPassword;
    expect(teacherPw).toBeDefined();

    // Assign teacher to class + subject
    const tsd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: teacherId, subject_id: subject.id, class_id: cd.id } });
    expect(tsd).not.toBeNull();

    // Create student
    const std = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Alice", last_name: "Eleve", email: STUDENT_EMAIL, class_id: cd.id, gender: "F" },
    });
    expect(std).not.toBeNull();

    // Log out admin
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Login as teacher
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

    // Navigate to grade entry page
    await page.goto(`${BASE}/${SCHOOL}/teacher/grades/${cd.id}/${subject.id}`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Verify page loaded
    await expect(page.locator("text=Saisie des notes").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Alice").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Grade entry page loaded");

    // Verify moyenne starts at 0.00
    await expect(page.locator("text=0.00").first()).toBeVisible({ timeout: 3000 });
    console.log("OK Default moyenne is 0.00");

    // Enter a Devoir score
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("14");
    await page.waitForTimeout(500);

    // Enter an Interro score
    await inputs.nth(1).fill("12");
    await page.waitForTimeout(500);

    // Enter a Compo score
    await inputs.nth(2).fill("15");
    await page.waitForTimeout(500);

    // Verify moyenne has updated (not 0.00)
    // Formula: (14 + 12 + 15*2) / 4 = (14 + 12 + 30) / 4 = 56 / 4 = 14.00
    await expect(page.locator("text=14.00").first()).toBeVisible({ timeout: 3000 });
    console.log("OK Dynamic average calculated: 14.00");

    // Click Sauvegarder
    await page.locator("button").filter({ hasText: "Sauvegarder tout" }).click();
    await page.waitForTimeout(2000);

    // Verify success message
    await expect(page.locator("text=Notes sauvegardées avec succès").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Grades saved successfully");

    // Verify persistence by checking API
    const persisted = await page.evaluate(async ({ base, studentId }) => {
      const r = await fetch(`${base}/api/grades?student_id=${studentId}`);
      if (!r.ok) return null;
      return await r.json();
    }, { base: BASE, studentId: std.id });
    expect(persisted).not.toBeNull();
    expect(Array.isArray(persisted)).toBe(true);
    expect(persisted.length).toBeGreaterThan(0);
    const homeworkGrade = persisted.find((g: any) => g.grade_type === "homework");
    expect(homeworkGrade).toBeDefined();
    expect(homeworkGrade.score).toBe(14);
    console.log("OK Grades persisted in database");
  });
});
