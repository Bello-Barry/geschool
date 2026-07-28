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

test.describe("Chantier 15 — Devoirs & TD/TP", () => {
  test.setTimeout(300000);

  async function setupSchool(page: any, rand: string, label: string) {
    const SCHOOL = `asg${label}-${rand}`;
    const ADMIN_EMAIL = `admasg${label}-${rand}@test.com`;

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
          firstName: "Admin", lastName: label, email: ADMIN_EMAIL, password: "Test123!",
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

    return { SCHOOL, schoolId: school!.id, academicYearId: ay!.id };
  }

  test("1. Teacher publishes assignment with attachment → student sees it, toggles 'fait', downloads attachment", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "1a");

    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "4eme A", level: "4eme", academic_year_id: ayId,
    });
    expect(classA).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Mathématiques", coefficient: 4,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teacher1a-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Math", last_name: "Teacher", email: teacherEmail,
      specialization: "Maths", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    // Create student BEFORE loginAs(teacher) — admin session required
    const studentEmail = `student1a-${rand}@test.com`;
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-1`, first_name: "Jane", last_name: "Doe",
      email: studentEmail, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();

    // Teacher creates assignment
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/assignments/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Exercices fractions");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=4eme A');
    await page.fill("#due_date", "2026-12-31");
    await page.fill("#description", "Faire les exercices 1 à 5 page 42");
    // Publish
    await page.click('text=Brouillon');
    await page.click('text=Publié');
    await page.click('text=Créer');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/assignments$`), { timeout: 15000 });

    // Verify teacher sees assignment with "0 élève ont coché fait"
    await expect(page.locator("text=Exercices fractions")).toBeVisible();
    await expect(page.locator("text=0 élève ont coché")).toBeVisible();

    // Login as student
    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/assignments`, { waitUntil: "networkidle" });

    // See assignment
    await expect(page.locator("text=Exercices fractions")).toBeVisible();
    await expect(page.locator("text=Devoir maison")).toBeVisible();
    await expect(page.locator("text=Faire les exercices 1 à 5 page 42")).toBeVisible();
    await expect(page.locator("text=À rendre le 31/12/2026")).toBeVisible();

    // Toggle "Fait"
    await page.click('button:has-text("Fait")');
    // Wait for toggle API to complete (loading spinner disappears, button shows "Annuler")
    await expect(page.locator("text=Annuler")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Fait")).toBeVisible();

    console.log("✅ Test 1 passed");
  });

  test("2. Parent sees child's assignment status", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "2a");

    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "5eme A", level: "5eme", academic_year_id: ayId,
    });
    expect(classA).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Français", coefficient: 3,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teacher2a-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "French", last_name: "Teacher", email: teacherEmail,
      specialization: "Français", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    // Create student BEFORE loginAs(teacher) — admin session required
    const studentEmail = `student2a-${rand}@test.com`;
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-2`, first_name: "Child", last_name: "One",
      email: studentEmail, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();

    // Teacher creates and publishes assignment
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/assignments/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Rédaction");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Français');
    await page.click('text=Sélectionner une classe');
    await page.click('text=5eme A');
    await page.fill("#due_date", "2026-11-30");
    await page.click('text=Brouillon');
    await page.click('text=Publié');
    await page.click('text=Créer');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/assignments$`), { timeout: 15000 });

    // Student does the assignment (toggle "Fait")
    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/assignments`, { waitUntil: "networkidle" });
    await page.click('button:has-text("Fait")');
    await page.waitForTimeout(1000);

    // Re-login as admin to create parent (requires admin_school role)
    const adminEmail = `admasg2a-${rand}@test.com`;
    await loginAs(page, adminEmail, "Test123!", SCHOOL);
    await page.waitForLoadState("networkidle");
    const parentEmail = `parent2a-${rand}@test.com`;
    const parentA = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Parent", last_name: "One", email: parentEmail,
      student_ids: [studentA.id], password: "Test123!",
    });
    expect(parentA).not.toBeNull();

    // Login as parent
    await loginAs(page, parentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/children/${studentA.id}/assignments`, { waitUntil: "networkidle" });

    // Should see the assignment with "Fait" status
    await expect(page.locator("text=Rédaction")).toBeVisible();
    await expect(page.locator("text=Fait").first()).toBeVisible();

    // Also check teacher sees completion count
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=1 élève ont coché")).toBeVisible();

    console.log("✅ Test 2 passed");
  });

  test("3. Cross-class security: student from other class cannot see assignment", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "3a");

    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: ayId,
    });
    expect(classA).not.toBeNull();

    const classB = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme B", level: "6eme", academic_year_id: ayId,
    });
    expect(classB).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Histoire", coefficient: 2,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teacher3a-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "History", last_name: "Teacher", email: teacherEmail,
      specialization: "Histoire", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    // Create students BEFORE loginAs(teacher) — admin session required
    const studentAEmail = `student3a-a-${rand}@test.com`;
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-a`, first_name: "Alice", last_name: "A",
      email: studentAEmail, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();

    const studentBEmail = `student3a-b-${rand}@test.com`;
    const studentB = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-b`, first_name: "Bob", last_name: "B",
      email: studentBEmail, class_id: classB.id, password: "Test123!",
    });
    expect(studentB).not.toBeNull();

    // Teacher publishes assignment for class A only
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/assignments/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Croisades");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Histoire');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    await page.fill("#due_date", "2026-10-15");
    await page.click('text=Brouillon');
    await page.click('text=Publié');
    await page.click('text=Créer');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/assignments$`), { timeout: 15000 });

    // Student A can see the assignment
    await loginAs(page, studentAEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Croisades")).toBeVisible();

    // Student B cannot see it
    await loginAs(page, studentBEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Croisades")).not.toBeVisible();
    await expect(page.locator("text=Aucun travail à rendre")).toBeVisible();

    console.log("✅ Test 3 passed");
  });

  test("4. Draft invisible to students and parents", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "4a");

    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "3eme C", level: "3eme", academic_year_id: ayId,
    });
    expect(classA).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Physique", coefficient: 3,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teacher4a-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Physics", last_name: "Teacher", email: teacherEmail,
      specialization: "Physique", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    // Create student BEFORE loginAs(teacher) — admin session required
    const studentEmail = `student4a-${rand}@test.com`;
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-4`, first_name: "Draft", last_name: "Test",
      email: studentEmail, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();

    // Teacher creates assignment in DRAFT (default)
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/assignments/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Mécanique (draft)");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Physique');
    await page.click('text=Sélectionner une classe');
    await page.click('text=3eme C');
    await page.fill("#due_date", "2026-09-01");
    await page.click('text=Créer');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/assignments$`), { timeout: 15000 });

    // Teacher can see it as "Brouillon"
    await expect(page.locator("text=Mécanique (draft)")).toBeVisible();
    await expect(page.locator("text=Brouillon")).toBeVisible();

    // Student cannot see it
    await loginAs(page, studentEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Mécanique (draft)")).not.toBeVisible();
    await expect(page.locator("text=Aucun travail à rendre")).toBeVisible();

    console.log("✅ Test 4 passed");
  });

  test("5. Admin sees all assignments, filtering by class works", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "5a");

    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "2nde A", level: "2nde", academic_year_id: ayId,
    });
    expect(classA).not.toBeNull();

    const classB = await createEntity(page, `${BASE}/api/classes`, {
      name: "2nde B", level: "2nde", academic_year_id: ayId,
    });
    expect(classB).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "SVT", coefficient: 3,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teacher5a-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Bio", last_name: "Teacher", email: teacherEmail,
      specialization: "SVT", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    // Teacher assigned to both classes
    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });
    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classB.id,
    });

    // Teacher creates assignments for both classes
    await loginAs(page, teacherEmail, "Test123!", SCHOOL);
    for (const { title, cls, label } of [
      { title: "TD Photosynthèse", cls: classA, label: "SVT" },
      { title: "TP Dissection", cls: classB, label: "SVT" },
    ]) {
      await page.goto(`${BASE}/${SCHOOL}/teacher/assignments/new`, { waitUntil: "networkidle" });
      await page.fill("#title", title);
      await page.click('text=Sélectionner une matière');
      await page.click(`text=${label}`);
      await page.click('text=Sélectionner une classe');
      await page.click(`text=${cls.name}`);
      await page.fill("#due_date", "2026-08-20");
      await page.click('text=Brouillon');
      await page.click('text=Publié');
      await page.click('text=Créer');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher/assignments$`), { timeout: 15000 });
    }

    // Admin sees all assignments
    const adminEmail = `admasg5a-${rand}@test.com`;
    await loginAs(page, adminEmail, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/admin/devoirs`, { waitUntil: "networkidle" });
    await expect(page.locator("text=TD Photosynthèse")).toBeVisible();
    await expect(page.locator("text=TP Dissection")).toBeVisible();

    // Filter by class
    await page.selectOption('select[name="class_id"]', classB.id);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page.locator("text=TP Dissection")).toBeVisible();
    await expect(page.locator("text=TD Photosynthèse")).not.toBeVisible();

    console.log("✅ Test 5 passed");
  });

  test("6. Cross-school security: assignment not visible in another school", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL: schoolA, schoolId: schoolAId, academicYearId: ayAId } = await setupSchool(page, rand, "6a");
    const { SCHOOL: schoolB } = await setupSchool(page, rand, "6b");

    // Re-login as school A's admin to create entities for school A
    const adminAEmail = `admasg6a-${rand}@test.com`;
    await loginAs(page, adminAEmail, "Test123!", schoolA);

    // Create entities in school A
    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "Term A", level: "Terminale", academic_year_id: ayAId,
    });
    expect(classA).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Anglais", coefficient: 2,
    });
    expect(subjectA).not.toBeNull();

    const teacherEmail = `teacher6a-${rand}@test.com`;
    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Eng", last_name: "Teacher", email: teacherEmail,
      specialization: "Anglais", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    const studentEmail = `student6a-${rand}@test.com`;
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-6`, first_name: "Cross", last_name: "School",
      email: studentEmail, class_id: classA.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();

    // Teacher publishes assignment in school A
    await loginAs(page, teacherEmail, "Test123!", schoolA);
    await page.goto(`${BASE}/${schoolA}/teacher/assignments/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "English Essay");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Anglais');
    await page.click('text=Sélectionner une classe');
    await page.click('text=Term A');
    await page.fill("#due_date", "2026-07-31");
    await page.click('text=Brouillon');
    await page.click('text=Publié');
    await page.click('text=Créer');
    await page.waitForURL(new RegExp(`${schoolA}/teacher/assignments$`), { timeout: 15000 });

    // Student in school A can see it
    await loginAs(page, studentEmail, "Test123!", schoolA);
    await page.goto(`${BASE}/${schoolA}/student/assignments`, { waitUntil: "networkidle" });
    await expect(page.locator("text=English Essay")).toBeVisible();

    // No student in school B — verify school B shows no assignments
    const adminBEmail = `admasg6b-${rand}@test.com`;
    await loginAs(page, adminBEmail, "Test123!", schoolB);
    await page.goto(`${BASE}/${schoolB}/admin/devoirs`, { waitUntil: "networkidle" });
    await expect(page.locator("text=English Essay")).not.toBeVisible();
    await expect(page.locator("text=Aucun devoir ou TD créé")).toBeVisible();

    console.log("✅ Test 6 passed");
  });
});
