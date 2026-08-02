import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createEntity(page: any, url: string, data: any) {
  return page.evaluate(
    async ({ url, data }: { url: string; data: any }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return r.ok ? await r.json() : null;
    },
    { url, data }
  );
}

async function loginAs(page: any, email: string, password: string, schoolSlug: string) {
  await page.goto(`http://localhost:3000/${schoolSlug}/login`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.evaluate(() => { localStorage.clear(); });
  await page.context().clearCookies();
  await page.goto(`http://localhost:3000/${schoolSlug}/login`, { waitUntil: "load" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url: URL) => /^\/(?:[^\/]+)\/(?:admin|teacher|parent|student)/.test(url.pathname),
    { timeout: 30000 }
  );
  await page.waitForTimeout(2000);
}

async function setupSchool(page: any, rand: string, label: string) {
  const SCHOOL = `mdue${label}-${rand}`;
  const ADMIN_EMAIL = `adminmdue${label}-${rand}@test.com`;

  await page.goto(`${BASE}/register`, { waitUntil: "load" });
  const reg = await page.evaluate(
    async ({ url, data }: { url: string; data: any }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: r.ok };
    },
    {
      url: `${BASE}/api/auth/register`,
      data: {
        firstName: "Admin",
        lastName: "Due",
        email: ADMIN_EMAIL,
        password: "Test123!",
        schoolName: `Due School ${label}`,
        subdomain: SCHOOL,
      },
    }
  );
  expect(reg.ok).toBeTruthy();

  await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("id")
    .eq("subdomain", SCHOOL)
    .single();
  expect(school).not.toBeNull();
  const schoolId = school!.id;

  const { data: academicYear, error: ayError } = await supabaseAdmin
    .from("academic_years")
    .insert({
      school_id: schoolId,
      name: "2025-2026",
      start_date: "2025-09-01",
      end_date: "2026-07-31",
      is_current: true,
    })
    .select("id")
    .single();
  if (ayError) throw new Error(`academic_years insert failed: ${ayError.message}`);
  expect(academicYear).not.toBeNull();

  return { SCHOOL, ADMIN_EMAIL, schoolId, academicYearId: academicYear!.id };
}

test.describe("Chantier 19 — Échéances mensuelles + uniformisation devise + sidebar mobile", () => {
  test.setTimeout(300000);

  test("1: sidebar mobile — lien Paiements visible et cliquable", async ({ page }) => {
    // Force mobile viewport so the hamburger menu (md:hidden) is visible
    await page.setViewportSize({ width: 375, height: 812 });
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL } = await setupSchool(page, rand, "1");

    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Open mobile menu (hamburger visible only on mobile viewport)
    const menuBtn = page.locator('button[aria-label="Menu"]');
    await menuBtn.click();
    await page.waitForTimeout(1000);

    // The sheet contains the Paiements link
    const sheet = page.locator('[role="dialog"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Scroll to the Paiements item (it's near the bottom of the 18-item list)
    const paymentsLink = sheet.locator('a:has-text("Paiements")').first();
    await paymentsLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(paymentsLink).toBeVisible({ timeout: 5000 });

    // Click it and verify navigation to /admin/payments
    await paymentsLink.click();
    await page.waitForURL((url: URL) => url.pathname === `/${SCHOOL}/admin/payments`, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await expect(page.locator("text=Gestion Financière").first()).toBeVisible({ timeout: 8000 });

    console.log("✅ Test 1 passed: sidebar mobile Paiements link visible & clickable");
  });

  test("2: format devise uniformisé — '25 000 FCFA' sans ₣", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, academicYearId } = await setupSchool(page, rand, "2");
    const PARENT_EMAIL = `parent2-${rand}@test.com`;
    const STUDENT_EMAIL = `student2-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: academicYearId,
    });
    expect(classData).not.toBeNull();
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "Alice", last_name: "Format",
      email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    expect(studentData).not.toBeNull();
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Sophie", last_name: "Format", email: PARENT_EMAIL,
      student_ids: [studentData.id], password: "Test123!",
    });

    // Set fee
    await page.evaluate(
      async ({ url, data }) => {
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      },
      {
        url: `${BASE}/api/tuition-fees`,
        data: { class_id: classData.id, academic_year_id: academicYearId, amount: 25000 },
      }
    );

    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "load" });
    await page.waitForTimeout(3000);

    // Parent sees "25 000 FCFA" formatted with space + FCFA (not 25000₣)
    const body = await page.locator("body").innerText();
    expect(body).toContain("25 000 FCFA");
    // No ₣ symbol anywhere
    expect(body).not.toContain("₣");

    console.log("✅ Test 2 passed: currency displayed as '25 000 FCFA'");
  });

  test("3: échéance du mois générée à la demande, sans doublon au rechargement", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "3");
    const PARENT_EMAIL = `parent3-${rand}@test.com`;
    const STUDENT_EMAIL = `student3-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "5eme B", level: "5eme", academic_year_id: academicYearId,
    });
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "Bob", last_name: "Mensuel",
      email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Marie", last_name: "Mensuel", email: PARENT_EMAIL,
      student_ids: [studentData.id], password: "Test123!",
    });

    // Set fee
    await page.evaluate(
      async ({ url, data }) => {
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      },
      {
        url: `${BASE}/api/tuition-fees`,
        data: { class_id: classData.id, academic_year_id: academicYearId, amount: 30000 },
      }
    );

    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);

    // First visit — generates the current-month due
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "load" });
    await page.waitForTimeout(3000);

    // Verify a monthly_due was created in the DB
    const { data: duesAfterFirst } = await supabaseAdmin
      .from("monthly_dues")
      .select("id, period_month, period_year, amount, status, due_date")
      .eq("student_id", studentData.id);
    expect(duesAfterFirst).not.toBeNull();
    expect(duesAfterFirst!.length).toBeGreaterThanOrEqual(1);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDue = duesAfterFirst!.find((d) => d.period_month === currentMonth && d.period_year === currentYear);
    expect(currentDue).toBeDefined();
    expect(currentDue!.amount).toBe(30000);
    expect(currentDue!.status).toBe("unpaid");

    // Reload — should NOT create a duplicate
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(3000);

    const { data: duesAfterReload } = await supabaseAdmin
      .from("monthly_dues")
      .select("id")
      .eq("student_id", studentData.id);
    expect(duesAfterReload!.length).toBe(duesAfterFirst!.length);

    // UI shows the "Échéances mensuelles" section
    await expect(page.locator("text=Échéances mensuelles").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=En attente").first()).toBeVisible({ timeout: 5000 });

    console.log("✅ Test 3 passed: monthly due generated on demand, no duplicates on reload");
  });

  test("5: SECURITE — un parent ne peut PAS voir les échéances d'un enfant qui n'est pas le sien (RLS)", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, schoolId, academicYearId } = await setupSchool(page, rand, "5");

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme D", level: "6eme", academic_year_id: academicYearId,
    });
    expect(classData).not.toBeNull();

    // Two students, each with their own parent
    const studentAData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STA-${rand}`, first_name: "Anna", last_name: "Secu",
      email: `stuA5-${rand}@test.com`, class_id: classData.id, password: "Test123!",
    });
    const studentBData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STB-${rand}`, first_name: "Bruno", last_name: "Secu",
      email: `stuB5-${rand}@test.com`, class_id: classData.id, password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "MamanA", last_name: "Secu", email: `parA5-${rand}@test.com`,
      student_ids: [studentAData.id], password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "MamanB", last_name: "Secu", email: `parB5-${rand}@test.com`,
      student_ids: [studentBData.id], password: "Test123!",
    });

    // Seed one monthly due for each student (same month/year, distinct students)
    const { data: dueA } = await supabaseAdmin
      .from("monthly_dues")
      .insert({
        school_id: schoolId,
        student_id: studentAData.id,
        class_id: classData.id,
        academic_year_id: academicYearId,
        period_year: 2026,
        period_month: 6,
        amount: 1000,
        due_date: "2026-06-01",
        status: "unpaid",
      })
      .select("id")
      .single();
    const { data: dueB } = await supabaseAdmin
      .from("monthly_dues")
      .insert({
        school_id: schoolId,
        student_id: studentBData.id,
        class_id: classData.id,
        academic_year_id: academicYearId,
        period_year: 2026,
        period_month: 6,
        amount: 2000,
        due_date: "2026-06-01",
        status: "unpaid",
      })
      .select("id")
      .single();
    expect(dueA).not.toBeNull();
    expect(dueB).not.toBeNull();

    // Sign in as parent A / parent B via a DEDICATED anon client (RLS applies — NOT
    // service role). Never reuse supabaseAdmin for auth, or its stored session would
    // replace the service-role bypass for subsequent tests.
    const anonAuth = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: sessA, error: errA } = await anonAuth.auth.signInWithPassword({
      email: `parA5-${rand}@test.com`,
      password: "Test123!",
    });
    const { data: sessB, error: errB } = await anonAuth.auth.signInWithPassword({
      email: `parB5-${rand}@test.com`,
      password: "Test123!",
    });
    expect(errA).toBeNull();
    expect(errB).toBeNull();
    const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${sessA!.session!.access_token}` } },
    });

    // Parent A can read their own child's due…
    const { data: aOwn } = await anonClient
      .from("monthly_dues")
      .select("id, student_id")
      .eq("id", dueA!.id);
    expect(aOwn).not.toBeNull();
    expect(aOwn!.length).toBe(1);
    expect(aOwn![0].student_id).toBe(studentAData.id);

    // …but CANNOT read parent B's child's due (not even by primary key)
    const { data: aOther } = await anonClient
      .from("monthly_dues")
      .select("id, student_id")
      .eq("id", dueB!.id);
    expect(aOther).not.toBeNull();
    expect(aOther!.length).toBe(0);

    // The full list for parent A only returns their own child's dues
    const { data: aAll } = await anonClient
      .from("monthly_dues")
      .select("id, student_id");
    expect(aAll!.every((d: any) => d.student_id === studentAData.id)).toBe(true);

    // Parent B is isolated the same way
    const anonClientB = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${sessB!.session!.access_token}` } },
    });
    const { data: bOwn } = await anonClientB
      .from("monthly_dues")
      .select("id")
      .eq("id", dueB!.id);
    expect(bOwn!.length).toBe(1);
    const { data: bOther } = await anonClientB
      .from("monthly_dues")
      .select("id")
      .eq("id", dueA!.id);
    expect(bOther!.length).toBe(0);

    console.log("✅ Test 5 passed: RLS isolates monthly dues per parent");
  });

  test("4: parent déclare → admin valide → échéance devient payée → parent la voit payée", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, academicYearId } = await setupSchool(page, rand, "4");
    const PARENT_EMAIL = `parent4-${rand}@test.com`;
    const STUDENT_EMAIL = `student4-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "4eme C", level: "4eme", academic_year_id: academicYearId,
    });
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "Claire", last_name: "Cycle",
      email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Pierre", last_name: "Cycle", email: PARENT_EMAIL,
      student_ids: [studentData.id], password: "Test123!",
    });

    // Set fee
    await page.evaluate(
      async ({ url, data }) => {
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      },
      {
        url: `${BASE}/api/tuition-fees`,
        data: { class_id: classData.id, academic_year_id: academicYearId, amount: 25000 },
      }
    );

    // Parent visits payments page -> due gets generated
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "load" });
    await page.waitForTimeout(3000);

    // Find the generated monthly due
    const { data: dues } = await supabaseAdmin
      .from("monthly_dues")
      .select("id")
      .eq("student_id", studentData.id);
    expect(dues).not.toBeNull();
    expect(dues!.length).toBeGreaterThanOrEqual(1);
    const dueId = dues![0].id;

    // Parent declares a payment linked to the due
    await page.click('text=J\'ai payé');
    await page.waitForTimeout(1000);
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Claire Cycle/ }).click();
    await page.waitForTimeout(500);

    // Select the monthly due in the dropdown (now shows in the form)
    const combos = page.locator('[role="combobox"]');
    if (await combos.count() > 1) {
      await combos.nth(1).click();
      await page.waitForTimeout(500);
      // Pick the option matching the month/year (not "Sans échéance spécifique")
      const dueOption = page.locator(`[role="option"]`, { hasText: /\d{4}/ }).first();
      await dueOption.click();
      await page.waitForTimeout(500);
    }

    const amountInput = page.locator('#amount');
    await amountInput.fill('25000');
    await page.locator('[role="combobox"]').last().click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Espèces/ }).click();
    await page.click('text=Déclarer le paiement');
    await page.waitForTimeout(4000);
    await page.waitForLoadState('load', { timeout: 20000 });
    await page.waitForTimeout(1500);

    // Verify payment is linked to the due
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, status, monthly_due_id, amount")
      .eq("student_id", studentData.id)
      .eq("status", "pending")
      .single();
    expect(payment).not.toBeNull();
    expect(payment!.monthly_due_id).toBe(dueId);
    expect(payment!.amount).toBe(25000);

    // Admin validates the payment
    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);
    const validateResp = await page.request.post(`/api/payments/${payment!.id}/validate`);
    expect(validateResp.ok()).toBeTruthy();

    // The monthly due should now be paid
    const { data: dueAfter } = await supabaseAdmin
      .from("monthly_dues")
      .select("status")
      .eq("id", dueId)
      .single();
    expect(dueAfter!.status).toBe("paid");

    // Parent sees the due as paid
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await expect(page.locator("text=Échéances mensuelles").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Payée").first()).toBeVisible({ timeout: 5000 });

    console.log("✅ Test 4 passed: declare → validate → due paid → parent sees Payée");
  });
});
