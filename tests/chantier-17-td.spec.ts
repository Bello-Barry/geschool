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
    (url: URL) => /^\/(?:[^/]+)\/(?:admin|teacher|parent|student)/.test(url.pathname),
    { timeout: 45000 }
  );
  await page.waitForTimeout(2500);
}

async function setupSchool(page: any, rand: string, label: string) {
  const SCHOOL = `td${label}-${rand}`;
  const ADMIN_EMAIL = `admintd${label}-${rand}@test.com`;

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
        lastName: "TD",
        email: ADMIN_EMAIL,
        password: "Test123!",
        schoolName: `TD School ${label}`,
        subdomain: SCHOOL,
      },
    }
  );
  expect(reg.ok, `register failed: ${JSON.stringify(reg.body)}`).toBeTruthy();

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

  // Create teacher user directly
  const TEACHER_EMAIL = `teachertd${label}-${rand}@test.com`;
  const { data: teacherAuth } = await supabaseAdmin.auth.admin.createUser({
    email: TEACHER_EMAIL,
    password: "Test123!",
    email_confirm: true,
    user_metadata: { first_name: "Prof", last_name: "TD", role: "teacher" },
  });
  expect(teacherAuth).not.toBeNull();
  await supabaseAdmin.from("users").insert({
    id: teacherAuth.user.id,
    school_id: schoolId,
    email: TEACHER_EMAIL,
    role: "teacher",
    first_name: "Prof",
    last_name: "TD",
  });
  const { data: teacher } = await supabaseAdmin.from("teachers").insert({
    user_id: teacherAuth.user.id,
    school_id: schoolId,
  }).select("id").single();
  expect(teacher).not.toBeNull();

  // Create a subject and assign teacher
  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH" })
    .select("id")
    .single();
  expect(subject).not.toBeNull();
  await supabaseAdmin.from("subject_teachers").insert({
    subject_id: subject!.id,
    teacher_id: teacher!.id,
    school_id: schoolId,
  });

  return { SCHOOL, ADMIN_EMAIL, TEACHER_EMAIL, schoolId, academicYearId: academicYear!.id, teacherId: teacher!.id, subjectId: subject!.id };
}

async function createClassAndStudents(page: any, supabaseAdmin: any, schoolId: string, academicYearId: string, rand: string, label: string) {
  const classData = await createEntity(page, `${BASE}/api/classes`, {
    name: `${label}eme A`, level: `${label}eme`, academic_year_id: academicYearId,
  });
  expect(classData).not.toBeNull();
  const classId = classData.id;

  const STUDENT_EMAILS = [
    `stutd${label}-${rand}-a@test.com`,
    `stutd${label}-${rand}-b@test.com`,
  ];
  const studentIds: string[] = [];
  for (let i = 0; i < STUDENT_EMAILS.length; i++) {
    const s = await createEntity(page, `${BASE}/api/students`, {
      matricule: `TD-${label}-${rand}-${i}`,
      first_name: `Student${i}`,
      last_name: label,
      email: STUDENT_EMAILS[i],
      class_id: classId,
      password: "Test123!",
    });
    expect(s).not.toBeNull();
    studentIds.push(s.id);
  }

  return { classId, studentIds, STUDENT_EMAILS };
}

async function selectRadixOption(page: any, comboboxIndex: number, optionName: string) {
  await page.locator('[role="combobox"]').nth(comboboxIndex).click();
  await page.getByRole("option", { name: new RegExp(optionName) }).click();
}

async function assignTeacherToClass(page: any, supabaseAdmin: any, teacherId: string, subjectId: string, classId: string, schoolId?: string) {
  const { error } = await supabaseAdmin.from("teacher_subjects").insert({
    teacher_id: teacherId,
    subject_id: subjectId,
    class_id: classId,
    school_id: schoolId,
  });
  if (error) throw new Error(`teacher_subjects insert failed: ${error.message}`);
}

test.describe("Chantier 17 — TD/TP sessions (présence + exercices)", () => {
  test.setTimeout(300000);

  test("1: teacher creates a TD session → appears in list", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, TEACHER_EMAIL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "1");
    const { classId } = await createClassAndStudents(page, supabaseAdmin, "", academicYearId, rand, "6");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    await loginAs(page, TEACHER_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/td`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Click "Nouvelle séance" button
    await page.click('button:has-text("Nouvelle séance")');
    await page.waitForTimeout(1000);

    // Fill form
    await page.fill('input[placeholder="Ex: TD N°3 - Équations"]', "TD Test - Équations");
    await selectRadixOption(page, 1, "Mathématiques");
    await selectRadixOption(page, 2, "6eme A");
    await page.locator('input[type="date"]').fill("2026-09-15");
    await page.click('button:has-text("Créer la séance")');
    await page.waitForTimeout(3000);

    // Should see the session in the list
    await expect(page.locator("text=TD Test - Équations").first()).toBeVisible({ timeout: 20000 });

    console.log("✅ Test 1 passed: teacher created TD session");
  });

  test("2: teacher marks a student present → visible in session detail", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, TEACHER_EMAIL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "2");
    const { classId, studentIds } = await createClassAndStudents(page, supabaseAdmin, schoolId, academicYearId, rand, "5");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    // Create TD session via API
    const { data: session } = await supabaseAdmin.from("td_sessions").insert({
      school_id: schoolId, teacher_id: teacherId, subject_id: subjectId,
      class_id: classId, type: "td", title: "TD Présences", session_date: "2026-09-20", status: "published",
    }).select("id").single();
    expect(session).not.toBeNull();

    await loginAs(page, TEACHER_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/teacher/td/${session!.id}`, { waitUntil: "load" });

    // Wait for the students list to load, then mark student 0 as present
    await expect(page.locator('button:has-text("Présent")').first()).toBeVisible({ timeout: 20000 });
    await page.click('button:has-text("Présent") >> nth=0');

    // Verify via API (poll until the POST completes in dev)
    await expect.poll(async () => {
      const { data } = await supabaseAdmin
        .from("td_attendance")
        .select("status")
        .eq("td_session_id", session!.id)
        .eq("student_id", studentIds[0])
        .single();
      return data?.status ?? null;
    }, { timeout: 20000 }).toBe("present");

    console.log("✅ Test 2 passed: teacher marked student present");
  });

  test("3: student sees published TD session without attendance info", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, TEACHER_EMAIL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "3");
    const { classId, studentIds, STUDENT_EMAILS } = await createClassAndStudents(page, supabaseAdmin, schoolId, academicYearId, rand, "4");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    // Create published TD session
    await supabaseAdmin.from("td_sessions").insert({
      school_id: schoolId, teacher_id: teacherId, subject_id: subjectId,
      class_id: classId, type: "td", title: "TD Visible", session_date: "2026-09-25", status: "published",
    });

    await loginAs(page, STUDENT_EMAILS[0], "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/td`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=TD Visible").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=Pas encore marqué").first()).toBeVisible({ timeout: 20000 });

    console.log("✅ Test 3 passed: student sees published TD with no attendance badge");
  });

  test("4: student cannot self-mark attendance", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "4");
    const { classId, studentIds, STUDENT_EMAILS } = await createClassAndStudents(page, supabaseAdmin, schoolId, academicYearId, rand, "3");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    // Create published TD session
    const { data: session } = await supabaseAdmin.from("td_sessions").insert({
      school_id: schoolId, teacher_id: teacherId, subject_id: subjectId,
      class_id: classId, type: "td", title: "TD Sécurité", session_date: "2026-09-30", status: "published",
    }).select("id").single();
    expect(session).not.toBeNull();

    // Login as the STUDENT (not the admin)
    await loginAs(page, STUDENT_EMAILS[0], "Test123!", SCHOOL);

    // Student tries to mark attendance via API
    const res = await page.evaluate(
      async ({ url, data }: { url: string; data: any }) => {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { status: r.status, body: r.ok ? null : await r.json() };
      },
      {
        url: `${BASE}/api/td/${session!.id}/attendance`,
        data: { student_id: studentIds[0], status: "present" },
      }
    );

    // Should be forbidden (student is not the teacher)
    console.log(`TEST4_PROOF POST /api/td/${session!.id}/attendance as student → HTTP ${res.status}`);
    expect(res.status).toBe(403);

    console.log("✅ Test 4 passed: student cannot self-mark attendance");
  });

  test("5: admin sees all TD sessions across classes", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "5");
    const { classId } = await createClassAndStudents(page, supabaseAdmin, schoolId, academicYearId, rand, "4");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    // Create 2 TD sessions
    await supabaseAdmin.from("td_sessions").insert([
      { school_id: schoolId, teacher_id: teacherId, subject_id: subjectId, class_id: classId, type: "td", title: "TD Admin 1", session_date: "2026-10-01", status: "published" },
      { school_id: schoolId, teacher_id: teacherId, subject_id: subjectId, class_id: classId, type: "tp", title: "TP Admin 1", session_date: "2026-10-05", status: "draft" },
    ]);

    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/admin/td`, { waitUntil: "load" });

    await expect(page.locator("text=TD Admin 1").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=TP Admin 1").first()).toBeVisible({ timeout: 20000 });

    console.log("✅ Test 5 passed: admin sees all TD sessions");
  });

  test("6: parent sees present/absent status for their child", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "6");
    const { classId, studentIds, STUDENT_EMAILS } = await createClassAndStudents(page, supabaseAdmin, schoolId, academicYearId, rand, "4");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    const PARENT_EMAIL = `parenttd6-${rand}@test.com`;

    // Create parent linked to student 0
    const parentData = await createEntity(page, `${BASE}/api/parents`, {
      first_name: "Parent", last_name: "TD", email: PARENT_EMAIL,
      student_ids: [studentIds[0]], password: "Test123!",
    });
    expect(parentData).not.toBeNull();

    // Create published TD session with attendance for student 0 = present
    const { data: session } = await supabaseAdmin.from("td_sessions").insert({
      school_id: schoolId, teacher_id: teacherId, subject_id: subjectId,
      class_id: classId, type: "td", title: "TD Parent", session_date: "2026-10-10", status: "published",
    }).select("id").single();
    expect(session).not.toBeNull();

    // Mark present
    await supabaseAdmin.from("td_attendance").insert({
      td_session_id: session!.id, student_id: studentIds[0], status: "present",
    });

    await loginAs(page, PARENT_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/parent/td`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Should see child in the list
    await expect(page.locator("text=Student0").first()).toBeVisible({ timeout: 20000 });
    await page.click('a:has-text("Voir les TD/TP")');
    await page.waitForURL(/parent\/children\/.+\/td/, { timeout: 10000 });
    // Should see "Présent" badge
    await expect(page.locator("text=Présent").first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    console.log("✅ Test 6 passed: parent sees child's attendance as present");
  });

  test("7: teacher uploads material → student sees document available", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, TEACHER_EMAIL, teacherId, subjectId, academicYearId, schoolId } = await setupSchool(page, rand, "7");
    const { classId, studentIds, STUDENT_EMAILS } = await createClassAndStudents(page, supabaseAdmin, schoolId, academicYearId, rand, "5");
    await assignTeacherToClass(page, supabaseAdmin, teacherId, subjectId, classId, schoolId);

    // Create published TD session
    const { data: session } = await supabaseAdmin.from("td_sessions").insert({
      school_id: schoolId, teacher_id: teacherId, subject_id: subjectId,
      class_id: classId, type: "td", title: "TD Matériel", session_date: "2026-10-15", status: "published",
    }).select("id").single();
    expect(session).not.toBeNull();

    // Upload a material via the API
    const uploadRes = await page.evaluate(
      async ({ url }: { url: string }) => {
        const blob = new Blob(["TD exercise content"], { type: "text/plain" });
        const formData = new FormData();
        formData.append("file", blob, "exercise-1.txt");
        const r = await fetch(url, { method: "POST", body: formData });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
      },
      { url: `${BASE}/api/td/${session!.id}/materials` }
    );
    expect(uploadRes.ok).toBeTruthy();

    // Login as student and check
    await loginAs(page, STUDENT_EMAILS[0], "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/student/td`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Should see the document indicator
    await expect(page.locator("text=1 document(s) disponible(s)").first()).toBeVisible({ timeout: 20000 });

    console.log("✅ Test 7 passed: teacher uploaded material → student sees document");
  });
});
