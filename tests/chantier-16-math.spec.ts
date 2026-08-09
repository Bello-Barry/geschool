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
  await page.evaluate(() => { localStorage.clear(); });
  await page.context().clearCookies();
  await page.goto(`http://localhost:3000/${schoolSlug}/login`, { waitUntil: "load" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}

test.describe("Chantier 16 — Formules mathématiques (KaTeX)", () => {
  test.setTimeout(300000);

  async function setupSchool(page: any, rand: string, label: string) {
    const SCHOOL = `mth${label}-${rand}`;
    const ADMIN_EMAIL = `admmath${label}-${rand}@test.com`;

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
          firstName: "Admin", lastName: "Math", email: ADMIN_EMAIL, password: "Test123!",
          schoolName: `School ${label}`, subdomain: SCHOOL,
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

    const { data: ay } = await supabaseAdmin
      .from("academic_years")
      .insert({
        school_id: school!.id,
        name: "2025-2026", start_date: "2025-09-01", end_date: "2026-07-31", is_current: true,
      })
      .select("id")
      .single();
    expect(ay).not.toBeNull();

    return { SCHOOL, schoolId: school!.id, academicYearId: ay!.id, adminEmail: ADMIN_EMAIL };
  }

  async function setupEntities(page: any, academicYearId: string, rand: string, label: string) {
    const className = "6eme A";
    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: className, level: "6eme", academic_year_id: academicYearId,
    });
    expect(classA).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Mathématiques", coefficient: 4,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teachermath${label}-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Math", last_name: "Prof", email: teacherEmail,
      specialization: "Maths", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    const studentEmail = `studentmath${label}-${rand}@test.com`;
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-m`, first_name: "Lucas", last_name: "Eleve",
      email: studentEmail, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();

    return { className, subjectName: "Mathématiques", teacherEmail, studentEmail, studentId: studentA.id };
  }

  async function createCourse(page: any, SCHOOL: string, opts: {
    title: string; keyPoints: string; publish?: boolean; attachPng?: boolean;
  }) {
    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", opts.title);
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    await page.fill("#key_points", opts.keyPoints);
    // Let the live preview settle so the layout is stable before interacting with the select
    await page.waitForTimeout(800);
    if (opts.attachPng) {
      await page.setInputFiles("#file-upload", {
        name: "schema-triangle.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        ),
      });
    }
    if (opts.publish) {
      await page.click('text=Brouillon');
      await page.getByRole('option', { name: 'Publié' }).click();
    }
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });
  }

  test("1. teacher inserts a fraction via the toolbar, sees live preview, publishes; student reads typeset math", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "1a");
    const { teacherEmail, studentEmail } = await setupEntities(page, academicYearId, rand, "1a");

    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Les fractions");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');

    // Toolbar button inserts the LaTeX snippet at the cursor
    await page.click('button[aria-label="Fraction"]');
    await expect(page.locator("#key_points")).toHaveValue("$\\frac{}{}$");

    // Live preview renders KaTeX without saving
    await expect(page.locator("text=Aperçu")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();

    // Real content: text + inline formula
    await page.fill("#key_points", "La moitié s'écrit $\\frac{1}{2}$");
    await expect(page.locator(".katex").first()).toBeVisible();

    // Publish
    await page.click('text=Brouillon');
    await page.click('text=Publié');
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });
    await expect(page.locator("text=Les fractions")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();

    // Student reads the typeset fraction
    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Les fractions")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator("text=La moitié s'écrit")).toBeVisible();

    console.log("✅ Test 1 passed");
  });

  test("2. parent sees the same typeset rendering (inline + display formula)", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "2a");
    const { teacherEmail, studentId } = await setupEntities(page, academicYearId, rand, "2a");

    const parentEmail = `parentmath2a-${rand}@test.com`;
    const parentA = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Sophie", last_name: "Parent", email: parentEmail,
      student_ids: [studentId], password: "Test123!",
    });
    expect(parentA).not.toBeNull();

    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await createCourse(page, SCHOOL, {
      title: "La vitesse moyenne",
      keyPoints: "La vitesse moyenne : $v = \\frac{d}{t}$\n$$\nE = m c^{2}\n$$",
      publish: true,
    });
    await expect(page.locator("text=La vitesse moyenne").first()).toBeVisible();

    await loginAs(page, parentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/children/${studentId}/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=La vitesse moyenne").first()).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-display").first()).toBeVisible();

    console.log("✅ Test 2 passed");
  });

  test("3. mix of text + inline/display formulas + attached photo renders correctly for the student", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "3a");
    const { teacherEmail, studentEmail } = await setupEntities(page, academicYearId, rand, "3a");

    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await createCourse(page, SCHOOL, {
      title: "Équations du second degré",
      keyPoints: "Résoudre $x^{2} - 4 = 0$\n$$\n\\Delta = b^{2} - 4ac\n$$",
      publish: true,
      attachPng: true,
    });

    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Équations du second degré")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-display").first()).toBeVisible();
    // surrounding text and photo attachment are shown
    await expect(page.locator("text=Résoudre")).toBeVisible();
    await expect(page.locator("text=Pièces jointes")).toBeVisible();
    await expect(page.locator("text=schema-triangle.png")).toBeVisible();

    console.log("✅ Test 3 passed");
  });

  test("4. formula in an assignment description renders for the student and the parent", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "4a");
    const { teacherEmail, studentId, studentEmail } = await setupEntities(page, academicYearId, rand, "4a");

    // Create the parent while the admin session is still active (required role)
    const parentEmail = `parentmath4a-${rand}@test.com`;
    const parentA = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Marie", last_name: "Parent", email: parentEmail,
      student_ids: [studentId], password: "Test123!",
    });
    expect(parentA).not.toBeNull();

    // Teacher creates and publishes an assignment with a formula
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/assignments/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Exercices fractions");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    await page.fill("#due_date", "2026-12-31");
    await page.fill("#description", "Calculer $\\frac{1}{2} + \\frac{1}{3}$");
    await page.waitForTimeout(800);
    await page.click('text=Brouillon');
    await page.getByRole('option', { name: 'Publié' }).click();
    await page.click('text=Créer');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/assignments$`), { timeout: 15000 });
    await expect(page.locator("text=Exercices fractions")).toBeVisible();

    // Student sees the typeset description
    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Exercices fractions")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();

    // Parent sees the same
    await loginAs(page, parentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/children/${studentId}/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Exercices fractions")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();

    console.log("✅ Test 4 passed");
  });

  test("5. invalid LaTeX shows a clear error message without crashing", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "5a");
    const { teacherEmail, studentEmail } = await setupEntities(page, academicYearId, rand, "5a");

    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Formule cassée");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    // Unbalanced brace => KaTeX parse error
    await page.fill("#key_points", "La formule $\\frac{1}{2$ est incomplète");

    // Clear error visible in the live preview, no crash
    await expect(page.locator(".katex-error").first()).toBeVisible();

    // Publication still works
    await page.click('text=Brouillon');
    await page.click('text=Publié');
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });
    await expect(page.locator("text=Formule cassée")).toBeVisible();

    // Student page renders the error instead of crashing
    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Formule cassée")).toBeVisible();
    await expect(page.locator(".katex-error").first()).toBeVisible();

    console.log("✅ Test 5 passed");
  });

  test("6. no horizontal overflow on mobile (375px) with the math toolbar and rendered formulas", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "6a");
    const { teacherEmail, studentEmail } = await setupEntities(page, academicYearId, rand, "6a");

    // Teacher form: toolbar must wrap, not overflow horizontally
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Géométrie");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    await page.fill("#key_points", "L'aire du cercle : $A = \\pi r^{2}$\n$$\n\\pi \\approx 3,14159\n$$");
    await page.waitForTimeout(800);
    await expect(page.locator('button[aria-label="Fraction"]')).toBeVisible();
    const formOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(formOverflow).toBeLessThanOrEqual(0);

    // Publish and check the student list with rendered formulas
    await page.click('text=Brouillon');
    await page.getByRole('option', { name: 'Publié' }).click();
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Géométrie")).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();
    const listOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(listOverflow).toBeLessThanOrEqual(0);

    console.log("✅ Test 6 passed");
  });
});
