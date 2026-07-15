import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Credentials Modal", () => {
  test.setTimeout(180000);

  test("admin creates student, teacher, parent — credentials modal shown with email + tempPassword", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "cred-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const STUDENT_EMAIL = `student-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;
    const PARENT_EMAIL = `parent-${rand}@test.com`;

    // ===== REGISTER SCHOOL =====
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const regResult = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: r.ok, body: await r.text() };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Test School", subdomain: SCHOOL },
    });
    expect(regResult.ok).toBeTruthy();

    // ===== SEED: Academic year, class =====
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd).not.toBeNull();

    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();

    // ===== 1. CREATE STUDENT =====
    await page.goto(`${BASE}/${SCHOOL}/admin/students/new`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    // Fill student form
    await page.fill('input[placeholder="MAT-2025-001"]', `MAT-${rand}`);
    await page.fill('input[placeholder="Jean"]', "Alice");
    await page.fill('input[placeholder="Dupont"]', "TestStudent");
    await page.fill('input[type="email"]', STUDENT_EMAIL);

    // Select class (Shadcn Select pattern)
    const classTrigger = page.locator('[role="combobox"]').nth(1);
    await classTrigger.click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(300);

    await page.fill('input[type="date"]', "2010-05-15");
    await page.fill('input[placeholder="Brazzaville"]', "Brazzaville");

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify modal is shown with email and password
    await expect(page.getByText("Compte créé avec succès")).toBeVisible();
    await expect(page.getByText(STUDENT_EMAIL)).toBeVisible();
    const studentPw = await page.locator('input.font-mono').inputValue();
    expect(studentPw.length).toBeGreaterThan(0);

    await page.getByText("J'ai noté").click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(new RegExp(`/${SCHOOL}/admin/students/?$`));

    // ===== 2. CREATE TEACHER =====
    await page.goto(`${BASE}/${SCHOOL}/admin/teachers/new`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder="Marc"]', "Robert");
    await page.fill('input[placeholder="Tshiani"]', "TestTeacher");
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[placeholder="Mathématiques"]', "Physique");

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await expect(page.getByText("Compte créé avec succès")).toBeVisible();
    await expect(page.getByText(TEACHER_EMAIL)).toBeVisible();
    const teacherPw = await page.locator('input.font-mono').inputValue();
    expect(teacherPw.length).toBeGreaterThan(0);

    await page.getByText("J'ai noté").click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(new RegExp(`/${SCHOOL}/admin/teachers/?$`));

    // ===== 3. CREATE PARENT =====
    await page.goto(`${BASE}/${SCHOOL}/admin/parents/new`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder="Samuel"]', "Marie");
    await page.fill('input[placeholder="Mvouba"]', "TestParent");
    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[placeholder="+242 06 123 4567"]', "+242 00 000 001");
    await page.fill('input[placeholder="Père / Mère"]', "Mère");

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await expect(page.getByText("Compte créé avec succès")).toBeVisible();
    await expect(page.getByText(PARENT_EMAIL)).toBeVisible();
    const parentPw = await page.locator('input.font-mono').inputValue();
    expect(parentPw.length).toBeGreaterThan(0);

    await page.getByText("J'ai noté").click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(new RegExp(`/${SCHOOL}/admin/parents/?$`));

    console.log("  ✅ All credentials modal tests passed");
  });
});
