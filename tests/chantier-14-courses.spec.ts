import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE_URL_PROD = "https://geschool.vercel.app";
const TENANT_URL_PROD = "https://lycee-sassou.geschool.vercel.app";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Decide which mode to run based on env vars
const runWithLocalDB = !!(SUPABASE_URL && SERVICE_ROLE_KEY);

if (runWithLocalDB) {
  // =========================================================================
  // MODE 1: LOCAL DB & FULL ISOLATION (Original Tests)
  // =========================================================================
  const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
  const BASE = "http://localhost:3000";

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

  test.describe("Chantier 14 — Cours (contenu pédagogique) - Local Mode", () => {
    test.setTimeout(300000);

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
        first_name: "Marie", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths",
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
        matricule: `STU-${rand}-1`, first_name: "Lucas", last_name: "Eleve", email: STUDENT_EMAIL, class_id: classId,
      });
      expect(studentData).not.toBeNull();

      // Login as teacher
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', TEACHER_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher`), { timeout: 15000 });

      // Go to courses page and create
      await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", "Introduction aux fractions");
      await page.click('text=Sélectionner une matière');
      await page.click('text=Mathématiques');
      await page.click('text=Sélectionner une classe');
      await page.click('text=6eme A');
      await page.fill("#key_points", "- Définition d'une fraction\n- Numérateur et dénominateur\n- Fractions équivalentes");
      await page.click('text=Brouillon');
      await page.click('text=Publié');
      await page.click('text=Créer le cours');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });
      await expect(page.locator("text=Introduction aux fractions")).toBeVisible();
      await expect(page.locator("text=Publié")).toBeVisible();

      // Login as student
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/student`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator("text=Introduction aux fractions")).toBeVisible();
      await expect(page.locator("text=Mathématiques")).toBeVisible();

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
    });

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

      const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
        name: "Français", coefficient: 3,
      });

      const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
        first_name: "Paul", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Français",
      });

      // Assign to class A only
      await createEntity(page, `${BASE}/api/teacher-subjects`, {
        teacher_id: teacherData.id, subject_id: subjectData.id, class_id: classA.id,
      });

      await createEntity(page, `${BASE}/api/students`, {
        matricule: `STU-${rand}-a`, first_name: "Alice", last_name: "A", email: STUDENT_A_EMAIL, class_id: classA.id,
      });
      await createEntity(page, `${BASE}/api/students`, {
        matricule: `STU-${rand}-b`, first_name: "Bob", last_name: "B", email: STUDENT_B_EMAIL, class_id: classB.id,
      });

      // Teacher creates course for class A
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', TEACHER_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", "Grammaire: le sujet");
      await page.click('text=Sélectionner une matière');
      await page.click('text=Français');
      await page.click('text=Sélectionner une classe');
      await page.click('text=6eme A');
      await page.fill("#key_points", "- Identifier le sujet\n- Accord sujet-verbe");
      await page.click('text=Brouillon');
      await page.click('text=Publié');
      await page.click('text=Créer le cours');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

      // Student A → sees course
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', STUDENT_A_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/student`), { timeout: 15000 });
      await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator("text=Grammaire: le sujet")).toBeVisible();

      // Student B → should NOT see
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', STUDENT_B_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/student`), { timeout: 15000 });
      await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator("text=Grammaire: le sujet")).not.toBeVisible();
    });

    test("parent sees courses of their child", async ({ page }) => {
      const rand = Math.random().toString(36).slice(2, 8);
      const { SCHOOL, academicYearId } = await setupSchool(page, rand, "3");
      const TEACHER_EMAIL = `teacher3-${rand}@test.com`;
      const STUDENT_EMAIL = `student3-${rand}@test.com`;
      const PARENT_EMAIL = `parent3-${rand}@test.com`;

      const classData = await createEntity(page, `${BASE}/api/classes`, {
        name: "5eme A", level: "5eme", academic_year_id: academicYearId,
      });

      const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
        name: "Sciences", coefficient: 3,
      });

      const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
        first_name: "Claire", last_name: "Scientifique", email: TEACHER_EMAIL, specialization: "Sciences",
      });

      await createEntity(page, `${BASE}/api/teacher-subjects`, {
        teacher_id: teacherData.id, subject_id: subjectData.id, class_id: classData.id,
      });

      const studentData = await createEntity(page, `${BASE}/api/students`, {
        matricule: `STU-${rand}-e`, first_name: "Emma", last_name: "Enfant", email: STUDENT_EMAIL, class_id: classData.id,
      });

      // Create parent linked to student
      await createEntity(page, `${BASE}/api/parents`, {
        first_name: "Sophie", last_name: "Parent", email: PARENT_EMAIL, children_ids: [studentData.id],
      });

      // Teacher creates published course
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', TEACHER_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", "La photosynthèse");
      await page.click('text=Sélectionner une matière');
      await page.click('text=Sciences');
      await page.click('text=Sélectionner une classe');
      await page.click('text=5eme A');
      await page.fill("#key_points", "- La chlorophylle\n- La lumière solaire\n- Le dioxyde de carbone");
      await page.click('text=Brouillon');
      await page.click('text=Publié');
      await page.click('text=Créer le cours');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

      // Parent logs in and navigates to child's courses
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', PARENT_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/parent`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL}/parent/children/${studentData.id}/courses`, { waitUntil: "networkidle" });
      await expect(page.locator("text=La photosynthèse")).toBeVisible();
    });

    test("draft course invisible to student, visible to teacher", async ({ page }) => {
      const rand = Math.random().toString(36).slice(2, 8);
      const { SCHOOL, academicYearId } = await setupSchool(page, rand, "4");
      const TEACHER_EMAIL = `teacher4-${rand}@test.com`;
      const STUDENT_EMAIL = `student4-${rand}@test.com`;

      const classData = await createEntity(page, `${BASE}/api/classes`, {
        name: "4eme A", level: "4eme", academic_year_id: academicYearId,
      });

      const subjectData = await createEntity(page, `${BASE}/api/subjects`, {
        name: "Histoire", coefficient: 2,
      });

      const teacherData = await createEntity(page, `${BASE}/api/teachers`, {
        first_name: "Hist", last_name: "Orienne", email: TEACHER_EMAIL, specialization: "Histoire",
      });

      await createEntity(page, `${BASE}/api/teacher-subjects`, {
        teacher_id: teacherData.id, subject_id: subjectData.id, class_id: classData.id,
      });

      await createEntity(page, `${BASE}/api/students`, {
        matricule: `STU-${rand}-d`, first_name: "Draft", last_name: "Student", email: STUDENT_EMAIL, class_id: classData.id,
      });

      // Teacher creates DRAFT course (default status)
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', TEACHER_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", "La Révolution française (brouillon)");
      await page.click('text=Sélectionner une matière');
      await page.click('text=Histoire');
      await page.click('text=Sélectionner une classe');
      await page.click('text=4eme A');
      await page.fill("#key_points", "- 1789\n- Prise de la Bastille");
      await page.click('text=Créer le cours');
      await page.waitForURL(new RegExp(`${SCHOOL}/teacher/courses$`), { timeout: 15000 });

      // Teacher sees draft
      await expect(page.locator("text=La Révolution française (brouillon)")).toBeVisible();

      // Student → should NOT see draft
      await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL}/student`), { timeout: 15000 });
      await page.goto(`${BASE}/${SCHOOL}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator("text=La Révolution française (brouillon)")).not.toBeVisible();
    });

    test("courses isolated between schools", async ({ page }) => {
      const rand = Math.random().toString(36).slice(2, 8);
      const { SCHOOL: SCHOOL_A, academicYearId: ayA } = await setupSchool(page, rand, "5a");
      const TEACHER_A_EMAIL = `teacher5a-${rand}@test.com`;

      // Create entities in school A
      const classA = await createEntity(page, `${BASE}/api/classes`, {
        name: "3eme A", level: "3eme", academic_year_id: ayA,
      });

      const subjectA = await createEntity(page, `${BASE}/api/subjects`, {
        name: "Anglais", coefficient: 3,
      });

      const teacherA = await createEntity(page, `${BASE}/api/teachers`, {
        first_name: "English", last_name: "Teacher", email: TEACHER_A_EMAIL, specialization: "Anglais",
      });

      await createEntity(page, `${BASE}/api/teacher-subjects`, {
        teacher_id: teacherA.id, subject_id: subjectA.id, class_id: classA.id,
      });

      // Teacher A creates course
      await page.goto(`${BASE}/${SCHOOL_A}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', TEACHER_A_EMAIL);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL_A}/teacher`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL_A}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", "English Vocabulary");
      await page.click('text=Sélectionner une matière');
      await page.click('text=Anglais');
      await page.click('text=Sélectionner une classe');
      await page.click('text=3eme A');
      await page.fill("#key_points", "- Hello\n- Goodbye");
      await page.click('text=Brouillon');
      await page.click('text=Publié');
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

      // Create class in school B
      const classB = await createEntity(page, `${BASE}/api/classes`, {
        name: "3eme B", level: "3eme", academic_year_id: ayB!.id,
      });

      // Create student in school B
      await createEntity(page, `${BASE}/api/students`, {
        matricule: `STU-${rand}-x`, first_name: "Cross", last_name: "Student", email: `cross-${rand}@test.com`, class_id: classB.id,
      });

      // Login as student B
      await page.goto(`${BASE}/${SCHOOL_B}/login`, { waitUntil: "load" });
      await page.fill('input[type="email"]', `cross-${rand}@test.com`);
      await page.fill('input[type="password"]', "Test123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`${SCHOOL_B}/student`), { timeout: 15000 });

      await page.goto(`${BASE}/${SCHOOL_B}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator("text=English Vocabulary")).not.toBeVisible();
    });
  });
} else {
  // =========================================================================
  // MODE 2: PRODUCTION/HTTP MODE (Directly testing against vercel)
  // =========================================================================
  test.describe("Chantier 14 — Cours (contenu pédagogique) - Prod Mode", () => {
    test.setTimeout(300000);

    const testId = Math.random().toString(36).slice(2, 8);
    const COURSE_TITLE = `E2E Course ${testId}`;
    const DRAFT_TITLE = `Draft E2E Course ${testId}`;

    test("1. teacher creates + publishes course, student sees and searches it", async ({ page }) => {
      // 1. Login as Teacher
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "jean.mbokani@lycee-sassou.cd");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/teacher`), { timeout: 30000 });

      // 2. Go to courses creation
      await page.goto(`${TENANT_URL_PROD}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", COURSE_TITLE);

      // Select Subject dynamically
      await page.click('button:has-text("Sélectionner une matière")');
      await page.locator('[role="option"]').first().click();

      // Select Class dynamically
      await page.click('button:has-text("Sélectionner une classe")');
      await page.locator('[role="option"]').first().click();

      await page.fill("#key_points", "- Premier point clé\n- Deuxième point clé");

      // Select Statut "Publié"
      await page.click('button:has-text("Brouillon")');
      await page.click('span:has-text("Publié")');

      await page.click('button:has-text("Créer le cours")');
      await page.waitForURL(new RegExp(`/teacher/courses`), { timeout: 30000 });

      // Verify visible in teacher dashboard
      await expect(page.locator(`text=${COURSE_TITLE}`)).toBeVisible();

      // 3. Login as Student
      await page.context().clearCookies();
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "alain.mabiala@etudiant.cd");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/student`), { timeout: 30000 });

      // 4. View student courses
      await page.goto(`${TENANT_URL_PROD}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator(`text=${COURSE_TITLE}`)).toBeVisible({ timeout: 15000 });

      // Search & Filter
      await page.fill('input[placeholder*="Rechercher"]', testId);
      await page.click('button:has-text("Filtrer")');
      await page.waitForTimeout(2000);
      await expect(page.locator(`text=${COURSE_TITLE}`)).toBeVisible();

      // Search non-matching
      await page.fill('input[placeholder*="Rechercher"]', "impossible_string_xyz");
      await page.click('button:has-text("Filtrer")');
      await page.waitForTimeout(2000);
      await expect(page.locator(`text=${COURSE_TITLE}`)).not.toBeVisible();
    });

    test("2. draft course invisible to student, visible to teacher", async ({ page }) => {
      // 1. Login as Teacher
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "jean.mbokani@lycee-sassou.cd");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/teacher`), { timeout: 30000 });

      // 2. Go to courses creation
      await page.goto(`${TENANT_URL_PROD}/teacher/courses/new`, { waitUntil: "networkidle" });
      await page.fill("#title", DRAFT_TITLE);

      // Select Subject dynamically
      await page.click('button:has-text("Sélectionner une matière")');
      await page.locator('[role="option"]').first().click();

      // Select Class dynamically
      await page.click('button:has-text("Sélectionner une classe")');
      await page.locator('[role="option"]').first().click();

      await page.fill("#key_points", "- Brouillon point clé");

      // Keep default status "Brouillon"
      await page.click('button:has-text("Créer le cours")');
      await page.waitForURL(new RegExp(`/teacher/courses`), { timeout: 30000 });

      // Verify visible to teacher
      await expect(page.locator(`text=${DRAFT_TITLE}`)).toBeVisible();

      // 3. Login as Student
      await page.context().clearCookies();
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "alain.mabiala@etudiant.cd");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/student`), { timeout: 30000 });

      // 4. View student courses - draft must be invisible
      await page.goto(`${TENANT_URL_PROD}/student/courses`, { waitUntil: "networkidle" });
      await expect(page.locator(`text=${DRAFT_TITLE}`)).not.toBeVisible();
    });

    test("3. parent sees courses of their child", async ({ page }) => {
      // 1. Login as Parent
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "antoine.mabiala@parent.cd");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/parent`), { timeout: 30000 });

      // 2. Go to Child Detail
      await page.goto(`${TENANT_URL_PROD}/parent/children`, { waitUntil: "networkidle" });
      await page.click('a:has-text("Voir")');
      await page.waitForLoadState("networkidle");

      // 3. Go to Child Courses
      await page.click('button:has-text("Voir les cours")');
      await page.waitForLoadState("networkidle");

      // Verify child courses page renders without crashing and shows published course
      await expect(page.locator("body")).toContainText("Cours de");
      await expect(page.locator(`text=${COURSE_TITLE}`)).toBeVisible();
    });

    test("4. parent sees programme of their child", async ({ page }) => {
      // 1. Login as Parent
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "antoine.mabiala@parent.cd");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/parent`), { timeout: 30000 });

      // 2. Go to general Programme page
      await page.goto(`${TENANT_URL_PROD}/parent/programme`, { waitUntil: "networkidle" });
      await expect(page.locator("body")).toContainText("Programme pédagogique");

      // 3. Go to Child Detail
      await page.goto(`${TENANT_URL_PROD}/parent/children`, { waitUntil: "networkidle" });
      await page.click('a:has-text("Voir")');
      await page.waitForLoadState("networkidle");

      // 4. Go to Child Programme
      await page.click('button:has-text("Voir le programme")');
      await page.waitForLoadState("networkidle");

      // Verify child programme page renders and has the table header
      await expect(page.locator("body")).toContainText("Programme de");
      await expect(page.locator("table")).toBeVisible();
    });

    test("5. admin sees all courses of the school", async ({ page }) => {
      // 1. Login as Admin
      await page.goto(`${TENANT_URL_PROD}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', "admin@lycee-sassou.test");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/admin`), { timeout: 30000 });

      // 2. Go to moderation page
      await page.goto(`${TENANT_URL_PROD}/admin/courses`, { waitUntil: "networkidle" });

      // 3. Verify Admin sees the moderator panel and can view course
      await expect(page.locator("body")).toContainText("Modération des cours");
      await expect(page.locator(`text=${COURSE_TITLE}`)).toBeVisible();
      await expect(page.locator(`text=${DRAFT_TITLE}`)).toBeVisible();
    });
  });
}
