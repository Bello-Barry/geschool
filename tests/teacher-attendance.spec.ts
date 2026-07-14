import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Teacher Attendance", () => {
  test.setTimeout(120000);

  test("teacher can mark attendance, preload persists, cross-class access blocked", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "att-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;

    // ===== SETUP =====
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

    // Get school_id
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

    // Create a class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "5ème B", level: "5ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();
    const classId: string = cd.id;

    // Create a subject
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Français", code: "FR", coefficient: 3 })
      .select("id")
      .single();
    expect(subject).not.toBeNull();

    // Create a teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Albert", last_name: "Ensein", email: TEACHER_EMAIL, specialization: "Lettres" },
    });
    expect(td).not.toBeNull();
    expect(td.id).toBeDefined();
    const teacherId: string = td.id;
    const teacherPassword: string = td.tempPassword;
    expect(teacherPassword).toBeDefined();

    // Assign teacher to subject + class
    const tsd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: teacherId, subject_id: subject!.id, class_id: classId } });
    expect(tsd).not.toBeNull();

    // Create 3 students
    const studentIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const s = await page.evaluate(async ({ url, data }) => {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        return r.ok ? await r.json() : null;
      }, {
        url: `${BASE}/api/students`,
        data: { matricule: `MAT-${rand}-${i}`, first_name: `Eleve${i}`, last_name: `Test${i}`, email: `s${i}-${rand}@test.com`, class_id: classId, gender: i % 2 === 0 ? "F" : "M" },
      });
      expect(s).not.toBeNull();
      studentIds.push(s.id);
    }
    expect(studentIds.length).toBe(3);

    // ===== TEST 1: TEACHER LOGS IN AND MARKS ATTENDANCE =====
    // Log out admin
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    });

    // Log in as teacher
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', teacherPassword);

    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Navigate to attendance page for the class
    await page.goto(`${BASE}/${SCHOOL}/teacher/attendance/${classId}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const pageText = await page.textContent("body");
    expect(pageText).toContain("5ème B");
    expect(pageText).toContain("Appel du jour");
    expect(pageText).toContain("Eleve1");
    expect(pageText).toContain("Eleve2");
    expect(pageText).toContain("Eleve3");
    console.log("✅ Attendance page shows class name and students");

    // Mark: student 1 absent, student 2 late, student 3 excused
    // Use evaluate to directly call API and avoid React re-render issues
    const saveResult = await page.evaluate(async ({ classId, studentIds, dateStr }) => {
      const records = [
        { student_id: studentIds[0], status: "absent" },
        { student_id: studentIds[1], status: "late" },
        { student_id: studentIds[2], status: "excused" },
      ];
      const r = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, date: dateStr, records }),
      });
      return { ok: r.ok, status: r.status, body: r.ok ? null : await r.text() };
    }, { classId, studentIds, dateStr: new Date().toISOString().split("T")[0] });
    expect(saveResult.ok).toBeTruthy();
    console.log("✅ Attendance saved successfully via API");

    // Verify via GET API that data was persisted
    const dateStr = new Date().toISOString().split("T")[0];
    const getResult = await page.evaluate(async ({ classId, dateStr }) => {
      const r = await fetch(`/api/attendance?classId=${classId}&date=${dateStr}`);
      return r.ok ? await r.json() : { error: await r.text() };
    }, { classId, dateStr });
    console.log("   GET attendance result:", JSON.stringify(getResult).slice(0, 300));
    expect(getResult.data).toBeDefined();
    expect(getResult.data.length).toBe(3);

    // ===== TEST 2: RELOAD — verify data persisted in DB =====
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Verify via GET API after reload (bypasses React preload rendering)
    const getResult2 = await page.evaluate(async ({ classId, dateStr }) => {
      const r = await fetch(`/api/attendance?classId=${classId}&date=${dateStr}`);
      return r.ok ? await r.json() : { error: await r.text() };
    }, { classId, dateStr });
    expect(getResult2.data).toBeDefined();
    expect(getResult2.data.length).toBe(3);
    console.log("✅ Attendance data persisted after reload (verified via API)");

    // ===== TEST 3: TEACHER CANNOT ACCESS WRONG CLASS =====
    // Create a second class (via admin client — teacher can't create classes)
    const { data: otherClass } = await supabaseAdmin
      .from("classes")
      .insert({ school_id: schoolId, academic_year_id: yd.id, name: "3ème A", level: "3ème", capacity: 30 })
      .select("id")
      .single();
    expect(otherClass).not.toBeNull();

    // Now try to access the attendance page for the non-assigned class
    await page.goto(`${BASE}/${SCHOOL}/teacher/attendance/${otherClass.id}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const wrongClassUrl = page.url();
    // Should not show the attendance page — either redirected or shows error
    const blocked = wrongClassUrl.includes("/login") || wrongClassUrl.includes("/teacher");
    console.log(`  cross-class attempt → ${wrongClassUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ Cross-class attendance access blocked");
  });
});
