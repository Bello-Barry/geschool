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
  // Navigate to login page first (stabilizes page context), then clear state
  await page.goto(`http://localhost:3000/${schoolSlug}/login`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.evaluate(() => { localStorage.clear(); });
  await page.context().clearCookies();
  await page.goto(`http://localhost:3000/${schoolSlug}/login`, { waitUntil: "load" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect chain to complete: login → /school → /school/dashboard
  await page.waitForURL(
    (url: URL) => /^\/(?:[^\/]+)\/(?:admin|teacher|parent|student)/.test(url.pathname),
    { timeout: 30000 }
  );
  await page.waitForTimeout(2000);
}

async function setupSchool(page: any, rand: string, label: string) {
  const SCHOOL = `pay${label}-${rand}`;
  const ADMIN_EMAIL = `adminpay${label}-${rand}@test.com`;

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
        lastName: "Pay",
        email: ADMIN_EMAIL,
        password: "Test123!",
        schoolName: `Pay School ${label}`,
        subdomain: SCHOOL,
      },
    }
  );
  expect(reg.ok).toBeTruthy();

  await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("id")
    .eq("subdomain", SCHOOL)
    .single();
  expect(school).not.toBeNull();
  const schoolId = school!.id;

  const { data: academicYear } = await supabaseAdmin
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
  expect(academicYear).not.toBeNull();

  return { SCHOOL, ADMIN_EMAIL, schoolId, academicYearId: academicYear!.id };
}

test.describe("Chantier 18 — Paiements de scolarité (flux déclaration → validation → reçu)", () => {
  test.setTimeout(300000);

  test("1: admin configure tuition fee (amount + due date), parent sees it", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "1");
    const PARENT_EMAIL = `parent1-${rand}@test.com`;
    const STUDENT_EMAIL = `student1-${rand}@test.com`;

    // Create class
    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: academicYearId,
    });
    expect(classData).not.toBeNull();
    const classId = classData.id;

    // Create student
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "Alice", last_name: "DuFees",
      email: STUDENT_EMAIL, class_id: classId, password: "Test123!",
    });
    expect(studentData).not.toBeNull();

    // Create parent linked to student
    const parentData = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Sophie", last_name: "DuFees", email: PARENT_EMAIL,
      student_ids: [studentData.id], password: "Test123!",
    });
    expect(parentData).not.toBeNull();

    // Admin sets tuition fee via PUT /api/tuition-fees
    const feeRes = await page.evaluate(
      async ({ url, data }: { url: string; data: any }) => {
        const r = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return r.ok ? await r.json() : null;
      },
      {
        url: `${BASE}/api/tuition-fees`,
        data: {
          class_id: classId,
          academic_year_id: academicYearId,
          amount: 25000,
          due_date: "2025-10-15",
          description: "Scolarité mensuelle",
        },
      }
    );
    expect(feeRes).not.toBeNull();
    expect(feeRes.amount).toBe(25000);

    // Login as parent
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);

    // Go to parent payments page
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Parent should see the fee amount for their child
    await expect(page.locator("text=25 000").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=6eme A").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Alice DuFees").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=J'ai payé").first()).toBeVisible({ timeout: 5000 });

    console.log("✅ Test 1 passed: admin configured fee, parent sees it");
  });

  test("2: parent declares payment → appears as pending for admin", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "2");
    const PARENT_EMAIL = `parent2-${rand}@test.com`;
    const STUDENT_EMAIL = `student2-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "5eme B", level: "5eme", academic_year_id: academicYearId,
    });
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "Bob", last_name: "Pay",
      email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Marie", last_name: "Pay", email: PARENT_EMAIL,
      student_ids: [studentData.id], password: "Test123!",
    });

    // Set tuition fee
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
        data: {
          class_id: classData.id, academic_year_id: academicYearId,
          amount: 30000, due_date: "2025-11-01",
        },
      }
    );

    // Login as parent
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);

    // Go to payments page and declare
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Click "J'ai payé"
    await page.click('text=J\'ai payé');
    await page.waitForTimeout(1000);

    // Fill form
    // Select child
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Bob Pay/ }).click();
    await page.waitForTimeout(500);

    // Fill amount
    const amountInput = page.locator('#amount');
    await amountInput.fill('30000');

    // Select payment method
    await page.locator('[role="combobox"]').nth(1).click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Mobile Money/ }).click();

    // Submit
    await page.click('text=Déclarer le paiement');
    // Page reloads after successful declaration
    await page.waitForTimeout(5000);

    // Should see the payment in the history table with "En attente" status
    await expect(page.locator("text=En attente").first()).toBeVisible({ timeout: 5000 });

    // Verify via API that payment is pending
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("status, amount, student_id")
      .eq("student_id", studentData.id)
      .eq("status", "pending");
    expect(payments).toHaveLength(1);
    expect(payments![0].amount).toBe(30000);
    expect(payments![0].status).toBe("pending");

    console.log("✅ Test 2 passed: parent declared payment → pending in DB");
  });

  test("3: admin validates payment → parent sees confirmé, receipt PDF downloadable", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, academicYearId } = await setupSchool(page, rand, "3");
    const PARENT_EMAIL = `parent3-${rand}@test.com`;
    const STUDENT_EMAIL = `student3-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "4eme C", level: "4eme", academic_year_id: academicYearId,
    });
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "Claire", last_name: "Valid",
      email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Pierre", last_name: "Valid", email: PARENT_EMAIL,
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

    // Parent declares payment
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.click('text=J\'ai payé');
    await page.waitForTimeout(1000);
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Claire Valid/ }).click();
    await page.waitForTimeout(500);
    const amountInput = page.locator('#amount');
    await amountInput.fill('25000');
    await page.locator('[role="combobox"]').nth(1).click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Espèces/ }).click();
    await page.click('text=Déclarer le paiement');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Get the payment ID from DB
    const { data: pending } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("student_id", studentData.id)
      .eq("status", "pending")
      .single();
    expect(pending).not.toBeNull();
    const paymentId = pending!.id;

    // Login as admin to call validate API
    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);
    const validateResp = await page.request.post(`/api/payments/${paymentId}/validate`);
    expect(validateResp.ok()).toBeTruthy();
    const validateRes = await validateResp.json();
    expect(validateRes).not.toBeNull();
    expect(validateRes.status).toBe("confirmed");
    expect(validateRes.confirmed_by).toBeDefined();
    expect(validateRes.receipt_pdf_url).toBeTruthy();

    // Verify receipt PDF exists in storage
    const { data: fileData } = await supabaseAdmin.storage
      .from("receipts")
      .download(validateRes.receipt_pdf_url);
    expect(fileData).not.toBeNull();
    const pdfBytes = await fileData!.arrayBuffer();
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    // Login as parent and check status
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Confirmé").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a:has-text("Télécharger")').first()).toBeVisible({ timeout: 5000 });

    // Verify receipt download
    const receiptRes = await page.request.get(`/api/payments/${paymentId}/receipt`);
    expect(receiptRes.ok()).toBeTruthy();
    const receiptBody = await receiptRes.body();
    expect(receiptBody.byteLength).toBeGreaterThan(1000);

    console.log("✅ Test 3 passed: admin validated → receipt generated → parent downloads");
  });

  test("4: admin rejects payment → parent sees rejeté, no receipt", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, academicYearId } = await setupSchool(page, rand, "4");
    const PARENT_EMAIL = `parent4-${rand}@test.com`;
    const STUDENT_EMAIL = `student4-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "3eme A", level: "3eme", academic_year_id: academicYearId,
    });
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}`, first_name: "David", last_name: "Reject",
      email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Julie", last_name: "Reject", email: PARENT_EMAIL,
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
        data: { class_id: classData.id, academic_year_id: academicYearId, amount: 20000 },
      }
    );

    // Create pending payment directly (declaration flow tested in Test 2)
    const { data: pendingPay } = await supabaseAdmin
      .from("payments")
      .insert({
        student_id: studentData.id,
        school_id: (await supabaseAdmin.from("schools").select("id").eq("subdomain", SCHOOL).single()).data!.id,
        academic_year_id: academicYearId,
        amount: 20000,
        payment_method: "cash",
        status: "pending",
        payment_date: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();
    expect(pendingPay).not.toBeNull();
    const paymentId = pendingPay!.id;

    // Admin rejects via API — login as admin first
    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);
    const rejectRes = await page.request.post(`/api/payments/${paymentId}/reject`);
    expect(rejectRes.ok()).toBeTruthy();

    // Verify in DB
    const { data: check } = await supabaseAdmin
      .from("payments")
      .select("status, receipt_pdf_url, confirmed_by")
      .eq("id", paymentId)
      .single();
    expect(check!.status).toBe("rejected");
    expect(check!.receipt_pdf_url).toBeNull();

    // Login as parent and check
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Rejeté").first()).toBeVisible({ timeout: 5000 });
    // No download link for rejected
    await expect(page.locator('a:has-text("Télécharger")')).toHaveCount(0);

    console.log("✅ Test 4 passed: admin rejected → parent sees rejeté, no receipt");
  });

  test("5: security — parent cannot declare payment for another parent's child", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "5");
    const PARENT_A_EMAIL = `parent5a-${rand}@test.com`;
    const PARENT_B_EMAIL = `parent5b-${rand}@test.com`;
    const STUDENT_A_EMAIL = `student5a-${rand}@test.com`;
    const STUDENT_B_EMAIL = `student5b-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: academicYearId,
    });

    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-a`, first_name: "Eve", last_name: "One",
      email: STUDENT_A_EMAIL, class_id: classData.id, password: "Test123!",
    });
    const studentB = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-b`, first_name: "Frank", last_name: "Two",
      email: STUDENT_B_EMAIL, class_id: classData.id, password: "Test123!",
    });

    // Parent A is linked to student A only
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Parent", last_name: "A", email: PARENT_A_EMAIL,
      student_ids: [studentA.id], password: "Test123!",
    });
    // Parent B is linked to student B only
    await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Parent", last_name: "B", email: PARENT_B_EMAIL,
      student_ids: [studentB.id], password: "Test123!",
    });

    // Login as Parent A and try to declare for Student B
    await loginAs(page, PARENT_A_EMAIL, "Test123!", SCHOOL);

    const declareRes = await page.evaluate(
      async ({ url, data }) => {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { ok: r.ok, status: r.status, body: r.ok ? null : await r.json() };
      },
      {
        url: `${BASE}/api/payments/declare`,
        data: {
          student_id: studentB.id,
          amount: 25000,
          payment_method: "cash",
        },
      }
    );

    // Should be forbidden
    expect(declareRes.ok).toBeFalsy();
    expect(declareRes.status).toBe(403);
    expect(declareRes.body.error).toContain("n'est pas votre enfant");

    // Also try via invalid student_id
    const badRes = await page.evaluate(
      async (url) => {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: "00000000-0000-0000-0000-000000000000",
            amount: 25000,
            payment_method: "cash",
          }),
        });
        return { status: r.status };
      },
      `${BASE}/api/payments/declare`
    );
    expect(badRes.status).toBe(403);

    console.log("✅ Test 5 passed: cross-child payment declaration blocked");
  });

  test("6: security — inter-école isolation", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL: schoolA, ADMIN_EMAIL: ADMIN_A_EMAIL, academicYearId: ayA } = await setupSchool(page, rand, "6a");
    const SCHOOL_B = `pay6b-${rand}`;
    const ADMIN_B_EMAIL = `admin6b-${rand}@test.com`;

    // Create second school
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(
      async ({ url, data }) => {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        return { ok: r.ok };
      },
      {
        url: `${BASE}/api/auth/register`,
        data: { firstName: "AdminB", lastName: "Test", email: ADMIN_B_EMAIL, password: "Test123!", schoolName: "Pay School B", subdomain: SCHOOL_B },
      }
    );

    const PARENT_EMAIL = `parent6-${rand}@test.com`;
    const STUDENT_EMAIL = `student6-${rand}@test.com`;

    // Registering school B overwrites the auth session — re-auth as school A's admin
    await loginAs(page, ADMIN_A_EMAIL, "Test123!", schoolA);

    // Create class + student + parent in school A only
    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: ayA,
    });
    expect(classA).not.toBeNull();
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-a`, first_name: "Grace", last_name: "SchoolA",
      email: STUDENT_EMAIL, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();
    const parentRec = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Parent", last_name: "SchoolA", email: PARENT_EMAIL,
      student_ids: [studentA.id], password: "Test123!",
    });
    expect(parentRec).not.toBeNull();

    // Login as parent in school A
    await loginAs(page, PARENT_EMAIL, "Test123!", schoolA);
    const urlAfterLogin = page.url();
    expect(urlAfterLogin).toContain(`/${schoolA}/parent`);

    // Verify parent can see their own child's info
    await page.goto(`${BASE}/${schoolA}/parent/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Grace SchoolA").first()).toBeVisible({ timeout: 5000 });

    // Try to access school B's payments (should redirect to login)
    await page.goto(`${BASE}/${SCHOOL_B}/parent/payments`, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain(`/${SCHOOL_B}/parent/payments`);
    // Should be on login page
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });

    console.log("✅ Test 6 passed: inter-school isolation works");
  });
});
