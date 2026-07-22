import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 11 — Emploi du temps (schedule_slots)", () => {
  test.setTimeout(180000);

  test("CRUD admin + consultation teacher/student/parent", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "sch-" + rand;
    const ADMIN_EMAIL = `ad-${rand}@test.com`;
    const TEACHER_EMAIL = `te-${rand}@test.com`;
    const STUDENT_EMAIL = `st-${rand}@test.com`;
    const PARENT_EMAIL = `pa-${rand}@test.com`;
    const USER_PW = "Test123!";

    // ── Register school ──────────────────────────────────
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, { url: `${BASE}/api/auth/register`, data: {
      firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: USER_PW, schoolName: `School ${rand}`, subdomain: SCHOOL,
    }});
    await page.waitForTimeout(2000);

    // ── Login as admin ───────────────────────────────────
    await page.context().clearCookies();
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/admin`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("networkidle");

    // ── Create academic year + classes + subjects + teacher ──
    const { data: school } = await supabaseAdmin
      .from("schools").select("id").eq("subdomain", SCHOOL).single();

    const { data: ay } = await supabaseAdmin
      .from("academic_years").insert({ school_id: school!.id, name: "2025-2026", start_date: "2025-09-01", end_date: "2026-07-31", is_current: true }).select().single();

    const { data: cls } = await supabaseAdmin
      .from("classes").insert({ school_id: school!.id, academic_year_id: ay!.id, name: "CM1", level: "CM1" }).select().single();

    const { data: subj } = await supabaseAdmin
      .from("subjects").insert({ school_id: school!.id, name: "Maths", coefficient: 4 }).select().single();

    // Teacher user
    const { data: teacherAuth } = await supabaseAdmin.auth.admin.createUser({
      email: TEACHER_EMAIL, password: USER_PW, email_confirm: true,
    });

    const { data: teacherUser } = await supabaseAdmin
      .from("users").insert({ id: teacherAuth.user!.id, email: TEACHER_EMAIL, school_id: school!.id, role: "teacher", first_name: "Jean", last_name: "Dupont" }).select().single();

    const { data: teacher } = await supabaseAdmin
      .from("teachers").insert({ user_id: teacherUser!.id, school_id: school!.id, employee_id: `T-${rand}` }).select().single();

    const { data: ts } = await supabaseAdmin
      .from("teacher_subjects").insert({ teacher_id: teacher!.id, subject_id: subj!.id, class_id: cls!.id, school_id: school!.id }).select().single();

    // ── CRUD: Create a schedule slot ────────────────────
    await page.goto(`${BASE}/${SCHOOL}/admin/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.locator("body")).toContainText("Emploi du temps", { timeout: 5000 });

    // Navigate to new
    await page.click('a:has-text("Nouveau créneau")');
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Fill form (shadcn Select uses Radix UI — click combobox then select option)
    await page.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: "CM1" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option").filter({ hasText: "Maths" }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("combobox").nth(2).click();
    await page.getByRole("option", { name: "Lundi" }).click();
    await page.waitForTimeout(300);
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill("08:00");
    await timeInputs.nth(1).fill("09:00");
    await page.fill('input[placeholder="Salle 12"]', "Salle A");

    await page.click('button[type="submit"]');
    await page.waitForURL(`**/${SCHOOL}/admin/schedule`, { timeout: 15000 });

    // Verify slot appears
    await expect(page.locator("body")).toContainText("08:00-09:00", { timeout: 5000 });
    await expect(page.locator("body")).toContainText("Salle A", { timeout: 5000 });

    // ── Test anti-overlap ────────────────────────────────
    await page.click('a:has-text("Nouveau créneau")');
    await page.waitForLoadState("networkidle");
    await page.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: "CM1" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option").filter({ hasText: "Maths" }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("combobox").nth(2).click();
    await page.getByRole("option", { name: "Lundi" }).click();
    await page.waitForTimeout(300);
    const timeInputs2 = page.locator('input[type="time"]');
    await timeInputs2.nth(0).fill("08:30");
    await timeInputs2.nth(1).fill("09:30");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    // Should show overlap error
    await expect(page.locator("body")).toContainText("chevauchant", { timeout: 5000 });

    // ── Edit the slot ────────────────────────────────────
    await page.goto(`${BASE}/${SCHOOL}/admin/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    // Click edit (pencil icon)
    await page.getByRole("link", { name: /Modifier/i }).first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const editTimeInputs = page.locator('input[type="time"]');
    await editTimeInputs.nth(0).fill("09:00");
    await editTimeInputs.nth(1).fill("10:00");
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/${SCHOOL}/admin/schedule`, { timeout: 10000 });
    await expect(page.locator("body")).toContainText("09:00-10:00", { timeout: 5000 });

    // ── Teacher sees their schedule ──────────────────────
    // Login as teacher
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);

    await page.goto(`${BASE}/${SCHOOL}/teacher/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("Emploi du temps", { timeout: 5000 });
    await expect(page.locator("body")).toContainText("Maths", { timeout: 5000 });
    await expect(page.locator("body")).toContainText("09:00-10:00", { timeout: 5000 });

    // ── Student sees their schedule ─────────────────────
    // Create student
    const { data: studentAuth } = await supabaseAdmin.auth.admin.createUser({
      email: STUDENT_EMAIL, password: USER_PW, email_confirm: true,
    });
    const { data: studentUser } = await supabaseAdmin
      .from("users").insert({ id: studentAuth.user!.id, email: STUDENT_EMAIL, school_id: school!.id, role: "student", first_name: "Marie", last_name: "Curie" }).select().single();
    const { data: student } = await supabaseAdmin
      .from("students").insert({ user_id: studentUser!.id, school_id: school!.id, class_id: cls!.id, matricule: `STU-${rand}` }).select().single();

    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/student`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);

    await page.goto(`${BASE}/${SCHOOL}/student/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("Maths", { timeout: 5000 });
    await expect(page.locator("body")).toContainText("09:00-10:00", { timeout: 5000 });

    // ── Parent sees child schedule ───────────────────────
    const { data: parentAuth } = await supabaseAdmin.auth.admin.createUser({
      email: PARENT_EMAIL, password: USER_PW, email_confirm: true,
    });
    const { data: parentUser } = await supabaseAdmin
      .from("users").insert({ id: parentAuth.user!.id, email: PARENT_EMAIL, school_id: school!.id, role: "parent", first_name: "Pierre", last_name: "Curie" }).select().single();
    const { data: parent } = await supabaseAdmin
      .from("parents").insert({ user_id: parentUser!.id, school_id: school!.id, relationship: "Père" }).select().single();
    await supabaseAdmin
      .from("student_parents").insert({ student_id: student!.id, parent_id: parent!.id, is_primary: true });

    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);

    // Navigate to schedule
    await page.goto(`${BASE}/${SCHOOL}/parent/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("Marie Curie", { timeout: 5000 });

    // Click on child
    await page.click(`a[href*="/${SCHOOL}/parent/children/${student!.id}/schedule"]`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toContainText("Maths", { timeout: 5000 });
    await expect(page.locator("body")).toContainText("09:00-10:00", { timeout: 5000 });
  });
});
