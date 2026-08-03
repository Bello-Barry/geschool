import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test("REPRO: student self-mark attendance attempt", async ({ page }) => {
  const rand = Math.random().toString(36).slice(2, 8);
  const SCHOOL = `tdrepro-${rand}`;
  const ADMIN_EMAIL = `admintdrepro-${rand}@test.com`;
  const STUDENT_EMAIL = `studrepro-${rand}@test.com`;

  // 1. Register school (admin session established)
  await page.goto(`${BASE}/register`, { waitUntil: "load" });
  const reg = await page.evaluate(
    async ({ url, data }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: r.ok, body: r.ok ? await r.json() : await r.json() };
    },
    {
      url: `${BASE}/api/auth/register`,
      data: {
        firstName: "Admin",
        lastName: "TD",
        email: ADMIN_EMAIL,
        password: "Test123!",
        schoolName: `TD Repro ${rand}`,
        subdomain: SCHOOL,
      },
    }
  );
  expect(reg.ok).toBeTruthy();

  const { data: school } = await supabaseAdmin
    .from("schools").select("id").eq("subdomain", SCHOOL).single();
  expect(school).not.toBeNull();
  const schoolId = school!.id;

  const { data: academicYear } = await supabaseAdmin
    .from("academic_years").insert({
      school_id: schoolId, name: "2025-2026",
      start_date: "2025-09-01", end_date: "2026-07-31", is_current: true,
    }).select("id").single();
  expect(academicYear).not.toBeNull();

  // 2. Teacher
  const TEACHER_EMAIL = `teacherrepro-${rand}@test.com`;
  const { data: teacherAuth } = await supabaseAdmin.auth.admin.createUser({
    email: TEACHER_EMAIL, password: "Test123!", email_confirm: true,
    user_metadata: { first_name: "Prof", last_name: "TD", role: "teacher" },
  });
  await supabaseAdmin.from("users").insert({
    id: teacherAuth.user.id, school_id: schoolId, email: TEACHER_EMAIL,
    role: "teacher", first_name: "Prof", last_name: "TD",
  });
  const { data: teacher } = await supabaseAdmin.from("teachers").insert({
    user_id: teacherAuth.user.id, school_id: schoolId,
  }).select("id").single();
  expect(teacher).not.toBeNull();

  // 3. Subject + subject_teachers
  const { data: subject } = await supabaseAdmin.from("subjects")
    .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH" })
    .select("id").single();
  await supabaseAdmin.from("subject_teachers").insert({
    subject_id: subject!.id, teacher_id: teacher!.id, school_id: schoolId,
  });

  // 4. Class
  const { data: classData } = await supabaseAdmin.from("classes").insert({
    name: "Repro A", level: "repro", academic_year_id: academicYear!.id, school_id: schoolId,
  }).select("id").single();
  expect(classData).not.toBeNull();

  // 5. Student auth + user + student record
  const { data: studentAuth } = await supabaseAdmin.auth.admin.createUser({
    email: STUDENT_EMAIL, password: "Test123!", email_confirm: true,
    user_metadata: { first_name: "Stu", last_name: "Dent", role: "student" },
  });
  await supabaseAdmin.from("users").insert({
    id: studentAuth.user.id, school_id: schoolId, email: STUDENT_EMAIL,
    role: "student", first_name: "Stu", last_name: "Dent",
  });
  const { data: student, error: studentInsertErr } = await supabaseAdmin.from("students").insert({
    user_id: studentAuth.user.id, school_id: schoolId, matricule: `REPRO-${rand}`,
    class_id: classData!.id,
  }).select("id").single();
  if (studentInsertErr) console.log("STUDENT_INSERT_ERROR:", studentInsertErr.message);
  expect(student).not.toBeNull();

  // 6. Published TD session
  const { data: session } = await supabaseAdmin.from("td_sessions").insert({
    school_id: schoolId, teacher_id: teacher!.id, subject_id: subject!.id,
    class_id: classData!.id, type: "td", title: "TD Sécurité",
    session_date: "2026-09-30", status: "published",
  }).select("id").single();
  expect(session).not.toBeNull();

  // 7. Login AS THE STUDENT
  await page.evaluate(() => { localStorage.clear(); });
  await page.context().clearCookies();
  await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
  await page.fill('input[type="email"]', STUDENT_EMAIL);
  await page.fill('input[type="password"]', "Test123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/^\/(?:[^/]+)\/(?:student|login)/, { timeout: 15000 }).catch(async () => {
    console.log("LOGIN_PAGE_CONTENT:", await page.content().then((c: string) => c.slice(0, 1500)));
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  const studentUrl = page.url();
  console.log("STUDENT_URL_AFTER_LOGIN:", studentUrl);

  // 8. Student attempts to mark their OWN attendance
  const res = await page.evaluate(
    async ({ url, data }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      let body: any = null;
      try { body = await r.json(); } catch {}
      return { status: r.status, body };
    },
    {
      url: `${BASE}/api/td/${session!.id}/attendance`,
      data: { student_id: student!.id, status: "present" },
    }
  );

  console.log("STUDENT_SELF_MARK_STATUS:", res.status);
  console.log("STUDENT_SELF_MARK_BODY:", JSON.stringify(res.body));

  // 9. Check DB: was attendance actually written?
  const { data: written } = await supabaseAdmin
    .from("td_attendance")
    .select("id")
    .eq("td_session_id", session!.id)
    .eq("student_id", student!.id);
  console.log("DB_ATTENDANCE_ROWS:", JSON.stringify(written));

  expect(res.status, "Student should be forbidden from marking attendance").toBe(403);
});
