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
  // Wait for Supabase sign-in + client redirect to complete
  await page.waitForTimeout(5000);
}

test.describe("Chantier 14 — Cours (contenu pédagogique)", () => {
  test.setTimeout(300000);

  // Helper: register school + get its academic year ID
  async function setupSchool(page: any, rand: string, label: string) {
    const SCHOOL = `crs${label}-${rand}`;
    const ADMIN_EMAIL = `admin${label}-${rand}@test.com`;

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
          lastName: "Test",
          email: ADMIN_EMAIL,
          password: "Test123!",
          schoolName: `School ${label}`,
          subdomain: SCHOOL,
        },
      }
    );
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Get school ID from DB
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("subdomain", SCHOOL)
      .single();
    expect(school).not.toBeNull();
    const schoolId = school!.id;

    // Create academic year via admin client (register API doesn't seed data)
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

  // ================================================================
  // TEST 1
  // ================================================================
  test("teacher creates + publishes course, student sees and searches it", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "1");
    const TEACHER_EMAIL = `teacher1-${rand}@test.com`;
    const STUDENT_EMAIL = `student1-${rand}@test.com`;

    // Create class
    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: academicYearId,
    });
    expect(classData).not.toBeNull();
    const classId = classData.id;

    // Create subject
    const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Mathématiques", coefficient: 4,
    });
    expect(subjectData).not.toBeNull();
    const subjectId = subjectData.id;

    // Create teacher
    const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Marie", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths", password: "Test123!",
    });
    expect(teacherData).not.toBeNull();
    const teacherId = teacherData.id;

    // Assign teacher
    const tsData = await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherId, subject_id: subjectId, class_id: classId,
    });
    expect(tsData).not.toBeNull();

    // Create student in same class
    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-1`, first_name: "Lucas", last_name: "Eleve", email: STUDENT_EMAIL, class_id: classId, password: "Test123!",
    });
    expect(studentData).not.toBeNull();

    await loginAs(page, TEACHER_EMAIL, "Test123!", SCHOOL);

    // Go to courses page and create
    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Introduction aux fractions");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Mathématiques');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    await page.fill("#key_points", "- Définition d'une fraction\n- Numérateur et dénominateur\n- Fractions équivalentes");
    // Open the status select (trigger shows current value "Brouillon"), then pick "Publié"
    // via force click: a plain text= click on the portalled option can be reported
    // "outside of the viewport" (Radix popper), and keyboard nav is unreliable on touch emulation.
    await page.click('text=Brouillon');
    const publishedOption = page.getByRole('option', { name: 'Publié' });
    await publishedOption.waitFor({ state: 'attached' });
    await publishedOption.click({ force: true });
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });
    await expect(page.locator("text=Introduction aux fractions")).toBeVisible();
    await expect(page.locator("text=Publié")).toBeVisible();

    await loginAs(page, STUDENT_EMAIL, "Test123!", SCHOOL);

    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Introduction aux fractions")).toBeVisible();
    await expect(page.locator("div.inline-flex:has-text('Mathématiques')")).toBeVisible();

    // Search
    await page.fill('input[placeholder*="Rechercher"]', "fractions");
    await page.click('button:has-text("Filtrer")');
    await page.waitForTimeout(1500);
    await expect(page.locator("text=Introduction aux fractions")).toBeVisible();

    // Search non-matching
    await page.fill('input[placeholder*="Rechercher"]', "géométrie");
    await page.click('button:has-text("Filtrer")');
    await page.waitForTimeout(1500);
    await expect(page.locator("text=Aucun cours trouvé")).toBeVisible();

    console.log("✅ Test 1 passed");
  });

  // ================================================================
  // TEST 2
  // ================================================================
  test("student from different class cannot see the course", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "2");
    const TEACHER_EMAIL = `teacher2-${rand}@test.com`;
    const STUDENT_A_EMAIL = `student2a-${rand}@test.com`;
    const STUDENT_B_EMAIL = `student2b-${rand}@test.com`;

    // Create classes
    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme A", level: "6eme", academic_year_id: academicYearId,
    });
    const classB = await createEntity(page, `${BASE}/api/classes`, {
      name: "6eme B", level: "6eme", academic_year_id: academicYearId,
    });
    expect(classA).not.toBeNull();
    expect(classB).not.toBeNull();

    const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Français", coefficient: 3,
    });
    expect(subjectData).not.toBeNull();

    const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Paul", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Français", password: "Test123!",
    });
    expect(teacherData).not.toBeNull();

    // Assign to class A only
    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherData.id, subject_id: subjectData.id, class_id: classA.id,
    });

    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-a`, first_name: "Alice", last_name: "A", email: STUDENT_A_EMAIL, class_id: classA.id, password: "Test123!",
    });
    const studentB = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-b`, first_name: "Bob", last_name: "B", email: STUDENT_B_EMAIL, class_id: classB.id, password: "Test123!",
    });
    expect(studentA).not.toBeNull();
    expect(studentB).not.toBeNull();

    // Logout admin, login as teacher
    await loginAs(page, TEACHER_EMAIL, "Test123!", SCHOOL);

    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "Grammaire: le sujet");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Français');
    await page.click('text=Sélectionner une classe');
    await page.click('text=6eme A');
    await page.fill("#key_points", "- Identifier le sujet\n- Accord sujet-verbe");
    // Open the status select (trigger shows current value "Brouillon"), then pick "Publié"
    // via force click: a plain text= click on the portalled option can be reported
    // "outside of the viewport" (Radix popper), and keyboard nav is unreliable on touch emulation.
    await page.click('text=Brouillon');
    const publishedOption = page.getByRole('option', { name: 'Publié' });
    await publishedOption.waitFor({ state: 'attached' });
    await publishedOption.click({ force: true });
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

    // Logout teacher, login as student A
    await loginAs(page, STUDENT_A_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Grammaire: le sujet")).toBeVisible();

    // Logout student A, login as student B
    await loginAs(page, STUDENT_B_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=Grammaire: le sujet")).not.toBeVisible();
    await expect(page.locator("text=Aucun cours publié")).toBeVisible();

    console.log("✅ Test 2 passed");
  });

  // ================================================================
  // TEST 3
  // ================================================================
  test("parent sees courses of their child", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "3");
    const TEACHER_EMAIL = `teacher3-${rand}@test.com`;
    const STUDENT_EMAIL = `student3-${rand}@test.com`;
    const PARENT_EMAIL = `parent3-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "5eme A", level: "5eme", academic_year_id: academicYearId,
    });
    expect(classData).not.toBeNull();

    const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Sciences", coefficient: 3,
    });
    expect(subjectData).not.toBeNull();

    const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Claire", last_name: "Scientifique", email: TEACHER_EMAIL, specialization: "Sciences", password: "Test123!",
    });
    expect(teacherData).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherData.id, subject_id: subjectData.id, class_id: classData.id,
    });

    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-e`, first_name: "Emma", last_name: "Enfant", email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    expect(studentData).not.toBeNull();

    // Create parent linked to student
    const parentData = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Sophie", last_name: "Parent", email: PARENT_EMAIL, student_ids: [studentData.id], password: "Test123!",
    });
    expect(parentData).not.toBeNull();

    // Logout admin, login as teacher
    await loginAs(page, TEACHER_EMAIL, "Test123!", SCHOOL);

    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "La photosynthèse");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Sciences');
    await page.click('text=Sélectionner une classe');
    await page.click('text=5eme A');
    await page.fill("#key_points", "- La chlorophylle\n- La lumière solaire\n- Le dioxyde de carbone");
    // Open the status select (trigger shows current value "Brouillon"), then pick "Publié"
    // via force click: a plain text= click on the portalled option can be reported
    // "outside of the viewport" (Radix popper), and keyboard nav is unreliable on touch emulation.
    await page.click('text=Brouillon');
    const publishedOption = page.getByRole('option', { name: 'Publié' });
    await publishedOption.waitFor({ state: 'attached' });
    await publishedOption.click({ force: true });
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

    // Logout teacher, login as parent
    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);

    await page.goto(`${BASE}/${SCHOOL}/parent/children/${studentData.id}/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=La photosynthèse")).toBeVisible();
    await expect(page.locator("div.inline-flex:has-text('Sciences')")).toBeVisible();
    await expect(page.locator("text=Emma Enfant")).toBeVisible();

    console.log("✅ Test 3 passed");
  });

  // ================================================================
  // TEST 4
  // ================================================================
  test("draft course invisible to student, visible to teacher", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, academicYearId } = await setupSchool(page, rand, "4");
    const TEACHER_EMAIL = `teacher4-${rand}@test.com`;
    const STUDENT_EMAIL = `student4-${rand}@test.com`;

    const classData = await createEntity(page, `${BASE}/api/classes`, {
      name: "4eme A", level: "4eme", academic_year_id: academicYearId,
    });
    expect(classData).not.toBeNull();

    const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Histoire", coefficient: 2,
    });
    expect(subjectData).not.toBeNull();

    const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Hist", last_name: "Orienne", email: TEACHER_EMAIL, specialization: "Histoire", password: "Test123!",
    });
    expect(teacherData).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherData.id, subject_id: subjectData.id, class_id: classData.id,
    });

    const studentData = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-d`, first_name: "Draft", last_name: "Student", email: STUDENT_EMAIL, class_id: classData.id, password: "Test123!",
    });
    expect(studentData).not.toBeNull();

    // Logout admin, login as teacher
    await loginAs(page, TEACHER_EMAIL, "Test123!", SCHOOL);

    await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "La Révolution française (brouillon)");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Histoire');
    await page.click('text=Sélectionner une classe');
    await page.click('text=4eme A');
    await page.fill("#key_points", "- 1789\n- Prise de la Bastille");
    // Keep as draft (default)
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

    // Teacher sees draft
    await expect(page.locator("text=La Révolution française (brouillon)")).toBeVisible();
    await expect(page.locator("div.inline-flex:has-text('Brouillon')")).toBeVisible();

    // Logout teacher, login as student
    await loginAs(page, STUDENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=La Révolution française (brouillon)")).not.toBeVisible();

    console.log("✅ Test 4 passed");
  });

  // ================================================================
  // TEST 5
  // ================================================================
  test("courses isolated between schools", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL: SCHOOL_A, academicYearId: ayA } = await setupSchool(page, rand, "5a");
    const TEACHER_A_EMAIL = `teacher5a-${rand}@test.com`;

    // Create entities in school A
    const classA = await createEntity(page, `${BASE}/api/classes`, {
      name: "3eme A", level: "3eme", academic_year_id: ayA,
    });
    expect(classA).not.toBeNull();

    const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
      name: "Anglais", coefficient: 3,
    });
    expect(subjectA).not.toBeNull();

    const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "English", last_name: "Teacher", email: TEACHER_A_EMAIL, specialization: "Anglais", password: "Test123!",
    });
    expect(teacherA).not.toBeNull();

    await createEntity(page, `${BASE}/api/teacher-subjects`, {
      teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
    });

    // Logout admin, login as teacher A
    await loginAs(page, TEACHER_A_EMAIL, "Test123!", SCHOOL_A);

    await page.goto(`${BASE}/${SCHOOL_A}/teacher/courses/new`, { waitUntil: "networkidle" });
    await page.fill("#title", "English Vocabulary");
    await page.click('text=Sélectionner une matière');
    await page.click('text=Anglais');
    await page.click('text=Sélectionner une classe');
    await page.click('text=3eme A');
    await page.fill("#key_points", "- Hello\n- Goodbye");
    // Open the status select (trigger shows current value "Brouillon"), then pick "Publié"
    // via force click: a plain text= click on the portalled option can be reported
    // "outside of the viewport" (Radix popper), and keyboard nav is unreliable on touch emulation.
    await page.click('text=Brouillon');
    const publishedOption = page.getByRole('option', { name: 'Publié' });
    await publishedOption.waitFor({ state: 'attached' });
    await publishedOption.click({ force: true });
    await page.click('text=Créer le cours');
    await page.waitForURL(new RegExp(`${SCHOOL_A}/teacher/courses$`), { timeout: 15000 });

    // Register school B fresh
    const SCHOOL_B = `crs5b-${rand}`;
    const ADMIN_B_EMAIL = `admin5b-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const regB = await page.evaluate(
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
          firstName: "Admin", lastName: "B", email: ADMIN_B_EMAIL, password: "Test123!",
          schoolName: "School B", subdomain: SCHOOL_B,
        },
      }
    );
    expect(regB.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL_B}/admin`, { waitUntil: "networkidle" });

    // Get school B ID and create academic year
    const { data: schoolB } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("subdomain", SCHOOL_B)
      .single();
    expect(schoolB).not.toBeNull();
    const { data: ayB } = await supabaseAdmin
      .from("academic_years")
      .insert({
        school_id: schoolB!.id,
        name: "2025-2026",
        start_date: "2025-09-01",
        end_date: "2026-07-31",
        is_current: true,
      })
      .select("id")
      .single();
    expect(ayB).not.toBeNull();

    // Create class in school B
    const classB = await createEntity(page, `${BASE}/api/classes`, {
      name: "3eme B", level: "3eme", academic_year_id: ayB!.id,
    });
    expect(classB).not.toBeNull();

    // Create student in school B
    const studentB = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-x`, first_name: "Cross", last_name: "Student", email: `cross-${rand}@test.com`, class_id: classB.id, password: "Test123!",
    });
    expect(studentB).not.toBeNull();

    // Logout, login as student B
    await loginAs(page, `cross-${rand}@test.com`, "Test123!", SCHOOL_B);

    await page.goto(`${BASE}/${SCHOOL_B}/student/courses`, { waitUntil: "networkidle" });
    await expect(page.locator("text=English Vocabulary")).not.toBeVisible();
    await expect(page.locator("text=Aucun cours publié")).toBeVisible();

    console.log("✅ Test 5 passed");
  });
});
