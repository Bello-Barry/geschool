import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 7 — Notifications automatiques", () => {
  test.setTimeout(180000);

  test("notifications for grade, absence, report, security, mark-as-read", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "ntf-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;
    const STUDENT1_EMAIL = `s1-${rand}@test.com`;
    const STUDENT2_EMAIL = `s2-${rand}@test.com`;
    const PARENT1_EMAIL = `p1-${rand}@test.com`;
    const PARENT2_EMAIL = `p2-${rand}@test.com`;

    // ===== REGISTER SCHOOL =====
    // Navigate first so fetch in evaluate has same-origin context
    await page.goto(`${BASE}/register`, { waitUntil: "load" });

    const regResult = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Test School", subdomain: SCHOOL },
    });
    expect(regResult.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "load" });
    expect(page.url()).toContain(`/${SCHOOL}/admin`);

    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId: string = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd).not.toBeNull();

    // Create term
    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: yd.id, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
      .select("id")
      .single();
    expect(term).not.toBeNull();
    const termId: string = term!.id;

    // Create class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();
    const classId: string = cd.id;

    // Create subject
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH", coefficient: 4 })
      .select("id")
      .single();
    expect(subject).not.toBeNull();

    // Create teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Paul", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });
    expect(td.id).toBeDefined();
    const teacherId: string = td.id;
    const teacherPw: string = td.tempPassword;

    // Assign teacher
    const tsd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: teacherId, subject_id: subject!.id, class_id: classId } });
    expect(tsd).not.toBeNull();

    // Create 2 students
    const s1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/students`, data: { matricule: `MAT-${rand}-1`, first_name: "Alice", last_name: "Enfant1", email: STUDENT1_EMAIL, class_id: classId, gender: "F" } });
    expect(s1).not.toBeNull();
    const student1Id: string = s1.id;

    const s2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/students`, data: { matricule: `MAT-${rand}-2`, first_name: "Bob", last_name: "Enfant2", email: STUDENT2_EMAIL, class_id: classId, gender: "M" } });
    expect(s2).not.toBeNull();
    const student2Id: string = s2.id;

    // Create parent 1 linked to student 1
    const p1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, { url: `${BASE}/api/parents`, data: { first_name: "Marie", last_name: "Mere1", email: PARENT1_EMAIL, phone: "+242 00 000 001", relationship: "Mère", student_ids: [student1Id] } });
    expect(p1.id).toBeDefined();

    // Create parent 2 linked to student 2
    const p2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, { url: `${BASE}/api/parents`, data: { first_name: "Jean", last_name: "Pere2", email: PARENT2_EMAIL, phone: "+242 00 000 002", relationship: "Père", student_ids: [student2Id] } });
    expect(p2.id).toBeDefined();

    // Set known passwords for parents
    const { data: parent1Rec } = await supabaseAdmin.from("parents").select("user_id").eq("id", p1.id).single();
    const { data: parent2Rec } = await supabaseAdmin.from("parents").select("user_id").eq("id", p2.id).single();
    expect(parent1Rec).not.toBeNull();
    expect(parent2Rec).not.toBeNull();
    const parent1UserId: string = parent1Rec!.user_id;
    const parent2UserId: string = parent2Rec!.user_id;
    const parentPw = "ParentTest123!";
    await supabaseAdmin.auth.admin.updateUserById(parent1UserId, { password: parentPw });
    await supabaseAdmin.auth.admin.updateUserById(parent2UserId, { password: parentPw });

    // Log out admin
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ====================================================================
    // TEST 1: Teacher creates a grade → parent 1 gets notification
    // ====================================================================
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', teacherPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Create a grade for student 1
    const gradeResult = await page.evaluate(async ({ base, data }) => {
      const r = await fetch(`${base}/api/grades`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      return { ok: r.ok, body: await r.text() };
    }, { base: BASE, data: { student_id: student1Id, subject_id: subject!.id, term_id: termId, grade_type: "exam", score: 16, date: "2025-12-01" } });
    expect(gradeResult.ok).toBeTruthy();

    // Wait for notification to be created
    await page.waitForTimeout(2000);

    // Log out teacher
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Log in as parent 1 and check notifications via API
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT1_EMAIL);
    await page.fill('input[type="password"]', parentPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Check notification via API
    const p1Notifs1 = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      const json = await r.json();
      return json.data || [];
    });
    expect(p1Notifs1.length).toBeGreaterThanOrEqual(1);
    const gradeNotif = p1Notifs1.find((n: any) => n.title === "Nouvelle note");
    expect(gradeNotif).toBeDefined();
    expect(gradeNotif.message).toContain("Mathématiques");
    expect(gradeNotif.message).toContain("16/20");
    expect(gradeNotif.is_read).toBe(false);
    console.log("✅ TEST 1: Grade notification received by parent 1");

    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ====================================================================
    // TEST 2: Teacher marks student 1 absent → parent 1 gets notification
    // ====================================================================
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', teacherPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const dateStr = new Date().toISOString().split("T")[0];
    const attResult = await page.evaluate(async ({ base, data }) => {
      const r = await fetch(`${base}/api/attendance`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      return { ok: r.ok };
    }, { base: BASE, data: { class_id: classId, date: dateStr, records: [{ student_id: student1Id, status: "absent" }] } });
    expect(attResult.ok).toBeTruthy();

    await page.waitForTimeout(2000);

    // Log out teacher
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Log in as parent 1 and check
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT1_EMAIL);
    await page.fill('input[type="password"]', parentPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const p1Notifs2 = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      const json = await r.json();
      return json.data || [];
    });
    const absenceNotif = p1Notifs2.find((n: any) => n.title === "Absence signalée");
    expect(absenceNotif).toBeDefined();
    expect(absenceNotif.message).toContain("absent");
    expect(absenceNotif.is_read).toBe(false);
    console.log("✅ TEST 2: Absence notification received by parent 1");

    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ====================================================================
    // TEST 3: Admin generates report → parent 1 gets notification with link
    // ====================================================================
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', "Test123!");
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/admin`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const reportResult = await page.evaluate(async ({ base, data }) => {
      const r = await fetch(`${base}/api/reports/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      return r.ok ? await r.json() : { error: await r.text() };
    }, { base: BASE, data: { studentId: student1Id, termId } });
    expect(reportResult.success).toBeTruthy();
    const reportUrl: string = reportResult.url;

    await page.waitForTimeout(2000);

    // Log out admin
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Log in as parent 1 and check
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT1_EMAIL);
    await page.fill('input[type="password"]', parentPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const p1Notifs3 = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      const json = await r.json();
      return json.data || [];
    });
    const reportNotif = p1Notifs3.find((n: any) => n.title === "Bulletin disponible");
    expect(reportNotif).toBeDefined();
    expect(reportNotif.link).toBe(reportUrl);
    expect(reportNotif.is_read).toBe(false);
    console.log("✅ TEST 3: Report notification received with link by parent 1");

    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ====================================================================
    // TEST 4: Security — parent 2 sees NO notifications for student 1
    // ====================================================================
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT2_EMAIL);
    await page.fill('input[type="password"]', parentPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const p2Notifs = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      const json = await r.json();
      return json.data || [];
    });
    // Parent 2 is linked to student 2, who has no grades/absences/reports
    const p2GradeNotif = p2Notifs.find((n: any) => n.title === "Nouvelle note");
    const p2AbsenceNotif = p2Notifs.find((n: any) => n.title === "Absence signalée");
    const p2ReportNotif = p2Notifs.find((n: any) => n.title === "Bulletin disponible");
    expect(p2GradeNotif).toBeUndefined();
    expect(p2AbsenceNotif).toBeUndefined();
    expect(p2ReportNotif).toBeUndefined();
    console.log("✅ TEST 4: Parent 2 does NOT see notifications for student 1");

    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ====================================================================
    // TEST 5: Mark notification as read → badge updates
    // ====================================================================
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT1_EMAIL);
    await page.fill('input[type="password"]', parentPw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Check badge visible
    await page.goto(`${BASE}/${SCHOOL}/parent`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // The notification bell should show a badge for unread count
    const badgeVisible = await page.locator(".bg-red-500").first().isVisible().catch(() => false);
    expect(badgeVisible).toBe(true);
    console.log("  Badge visible with unread count");

    // Mark first notification as read via API
    const unreadNotifs = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      const json = await r.json();
      return (json.data || []).filter((n: any) => !n.is_read);
    });
    expect(unreadNotifs.length).toBeGreaterThan(0);

    await page.evaluate(async (notifId) => {
      await fetch(`/api/notifications/${notifId}`, { method: "PATCH" });
    }, unreadNotifs[0].id);

    await page.waitForTimeout(1000);

    // Reload and check badge count decreased (or remains if still unread)
    const remainingUnread = await page.evaluate(async () => {
      const r = await fetch("/api/notifications");
      const json = await r.json();
      return (json.data || []).filter((n: any) => !n.is_read).length;
    });
    expect(remainingUnread).toBe(unreadNotifs.length - 1);
    console.log("✅ TEST 5: Mark as read reduces unread count");

    console.log("\n🎉 ALL 5 TESTS PASSED");
  });
});
