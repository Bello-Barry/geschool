import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Student Dashboard", () => {
  test.setTimeout(120000);

  test("student can view dashboard and grades, cross-school access blocked", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "sdash-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const studentEmail = `student-${rand}@test.com`;

    // ===== SETUP =====
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const regResult = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: r.ok, body: await r.text() };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Test School", subdomain: SCHOOL },
    });
    expect(regResult.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "load" });
    expect(page.url()).toContain(`/${SCHOOL}/admin`);

    // Get school_id via debug endpoint
    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    console.log("Debug response:", JSON.stringify(debug?.headers, null, 2));
    const schoolId: string = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year, class via browser fetch
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd).not.toBeNull();
    const academicYearId: string = yd.id;

    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème A", level: "6ème", academic_year_id: academicYearId, capacity: 30 } });
    expect(cd).not.toBeNull();
    const classId: string = cd.id;

    // Create subject and term via admin client (direct DB insert)
    const { data: subject, error: subjectErr } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH", coefficient: 4 })
      .select("id")
      .single();
    if (subjectErr) console.error("Subject insert error:", subjectErr);
    expect(subject).not.toBeNull();
    const subjectId: string = subject!.id;

    const { data: term, error: termErr } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: academicYearId, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
      .select("id")
      .single();
    if (termErr) console.error("Term insert error:", termErr);
    expect(term).not.toBeNull();
    const termId: string = term!.id;

    // Create student via browser fetch (modified API returns tempPassword)
    const sd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Marie", last_name: "Curie", email: studentEmail, class_id: classId, gender: "F" },
    });
    expect(sd).not.toBeNull();
    expect(sd.id).toBeDefined();
    const studentId: string = sd.id;
    const studentPassword: string = sd.tempPassword;
    expect(studentPassword).toBeDefined();

    // Create a grade via browser fetch
    const gd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await r.text();
      try { return r.ok ? JSON.parse(body) : { error: r.status, body }; } catch { return { error: r.status, body }; }
    }, {
      url: `${BASE}/api/grades`,
      data: { student_id: studentId, subject_id: subjectId, term_id: termId, grade_type: "exam", score: 15, date: "2025-12-01" },
    });
    expect(gd).not.toBeNull();
    expect(gd.id).toBeDefined();

    // ===== TEST 1: STUDENT DASHBOARD =====
    // Clear auth session (log out admin) then log in as student
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    // Fill login form
    await page.fill('input[type="email"]', studentEmail);
    await page.fill('input[type="password"]', studentPassword);

    // Submit and wait for redirect to student dashboard
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/student`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    // Check dashboard content
    const dashboardText = await page.textContent("body");
    expect(dashboardText).toContain("Marie");
    expect(dashboardText).toContain("Curie");
    expect(dashboardText).toContain("6ème A");
    expect(dashboardText).toContain("15/20");
    console.log("✅ Student dashboard shows name, class, grade");

    // ===== TEST 2: GRADES PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/student/grades`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const gradesText = await page.textContent("body");
    expect(gradesText).toContain("Mathématiques");
    expect(gradesText).toContain("15");
    expect(gradesText).toContain("Composition");
    expect(gradesText).toContain("Trimestre 1");
    console.log("✅ Grades page shows subject, score, type, term");

    // ===== TEST 3: CROSS-SCHOOL STUDENT ACCESS =====
    // Register second school, create a second student
    const rand2 = Math.random().toString(36).slice(2, 8);
    const SCHOOL2 = "sdash2-" + rand2;
    const student2Email = `student2-${rand2}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok;
    }, { url: `${BASE}/api/auth/register`, data: { firstName: "Admin", lastName: "Two", email: `admin2-${rand2}@test.com`, password: "Test123!", schoolName: "School Two", subdomain: SCHOOL2 } });
    expect(reg2).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL2}/admin`, { waitUntil: "load" });

    const debug2 = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const school2Id: string = debug2?.headers?.["x-school-id"];
    expect(school2Id).toBeDefined();

    // Create academic year + class + student for school 2
    const yd2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd2).not.toBeNull();

    const cd2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "5ème B", level: "5ème", academic_year_id: yd2.id, capacity: 30 } });
    expect(cd2).not.toBeNull();

    const sd2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT2-${rand2}`, first_name: "Pierre", last_name: "Deux", email: student2Email, class_id: cd2.id, gender: "M" },
    });
    expect(sd2).not.toBeNull();
    const student2Password: string = sd2.tempPassword;
    expect(student2Password).toBeDefined();

    // Log in as SCHOOL2's student
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL2}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', student2Email);
    await page.fill('input[type="password"]', student2Password);

    await Promise.all([
      page.waitForURL(`**/${SCHOOL2}/student`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("networkidle");

    // Now try to access SCHOOL1's student dashboard while logged in as SCHOOL2's student
    await page.goto(`${BASE}/${SCHOOL}/student`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const crossUrl = page.url();
    // Should redirect to login since SCHOOL2's student has no record in SCHOOL
    const blocked = !crossUrl.includes("/student") || crossUrl.includes("/login");
    console.log(`  cross-school attempt → ${crossUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ Cross-school student access blocked");
  });
});
