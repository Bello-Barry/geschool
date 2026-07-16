import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 6 — 404 fixes + attendance visibility", () => {
  test.setTimeout(180000);

  test("parent child detail, teacher grades entry, admin/parent attendance views, security", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "ch6-" + rand;
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

    // Create term directly via admin client
    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: yd.id, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2025-12-20", is_current: true })
      .select("id")
      .single();
    expect(term).not.toBeNull();

    // Create classes
    const cd1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd1).not.toBeNull();

    const cd2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème B", level: "6ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd2).not.toBeNull();

    // Create subject
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH", coefficient: 4 })
      .select("id")
      .single();
    expect(subject).not.toBeNull();

    // ===== CREATE TEACHER =====
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
    expect(teacherPw).toBeDefined();

    // Assign teacher to class 1
    const tsd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: teacherId, subject_id: subject!.id, class_id: cd1.id } });
    expect(tsd).not.toBeNull();

    // ===== CREATE TWO STUDENTS =====
    const s1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}-1`, first_name: "Alice", last_name: "Enfant1", email: STUDENT1_EMAIL, class_id: cd1.id, gender: "F" },
    });
    expect(s1).not.toBeNull();

    const s2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}-2`, first_name: "Bob", last_name: "Enfant2", email: STUDENT2_EMAIL, class_id: cd2.id, gender: "M" },
    });
    expect(s2).not.toBeNull();

    // ===== CREATE PARENT 1 (linked to student 1) =====
    const p1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Marie", last_name: "Mere1", email: PARENT1_EMAIL, phone: "+242 00 000 001", relationship: "Mère", student_ids: [s1.id] },
    });
    expect(p1.id).toBeDefined();
    const parent1Pw: string = p1.tempPassword;
    expect(parent1Pw).toBeDefined();

    // ===== CREATE PARENT 2 (linked to student 2) =====
    const p2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Jean", last_name: "Pere2", email: PARENT2_EMAIL, phone: "+242 00 000 002", relationship: "Père", student_ids: [s2.id] },
    });
    expect(p2.id).toBeDefined();
    const parent2Pw: string = p2.tempPassword;
    expect(parent2Pw).toBeDefined();

    // ===== SEED ATTENDANCE via admin API for student 1 =====
    const today = new Date().toISOString().split("T")[0];
    const saveAtt = await page.evaluate(async ({ classId, records, date, base }) => {
      const r = await fetch(`${base}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, date, records }),
      });
      return { ok: r.ok, status: r.status };
    }, { classId: cd1.id, records: [{ student_id: s1.id, status: "present" }], date: today, base: BASE });
    expect(saveAtt.ok).toBeTruthy();

    // Log out admin
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ===== TEST 1: PARENT CLICKS CHILD → DETAIL PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT1_EMAIL);
    await page.fill('input[type="password"]', parent1Pw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Navigate directly to child detail
    await page.goto(`${BASE}/${SCHOOL}/parent/children/${s1.id}`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    // Should show detail page, not 404
    expect(page.url()).toContain(`/${SCHOOL}/parent/children/${s1.id}`);
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Alice");
    expect(bodyText).toContain("Enfant1");
    expect(bodyText).toContain("Dernières notes");
    expect(bodyText).toContain("Voir les bulletins");
    expect(bodyText).toContain("Voir les présences");
    console.log("✅ TEST 1: Parent child detail page shows info + links (not 404)");

    // Log out parent
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ===== TEST 2: TEACHER GRADES ENTRY =====
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

    // Go to grades page
    await page.goto(`${BASE}/${SCHOOL}/teacher/grades`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const gradesPageText = await page.textContent("body");
    expect(gradesPageText).toContain("6ème A");
    expect(gradesPageText).toContain("Mathématiques");
    expect(gradesPageText).not.toContain("6ème B");
    console.log("✅ Teacher grades page shows assigned class + subjects");

    // Navigate directly to grade entry for selected class/subject
    await page.goto(`${BASE}/${SCHOOL}/teacher/grades/${cd1.id}/${subject!.id}`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    const entryUrl = page.url();
    expect(entryUrl).toContain(`/${SCHOOL}/teacher/grades/${cd1.id}/${subject!.id}`);
    const entryBodyText = await page.textContent("body");
    expect(entryBodyText).toContain("Saisie des notes");
    expect(entryBodyText).toContain("Alice");
    console.log("✅ TEST 2: Teacher clicks subject → grade entry page");

    // Log out teacher
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ===== TEST 3: ADMIN CONSULTS ATTENDANCE =====
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

    await page.goto(`${BASE}/${SCHOOL}/admin/attendance`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const adminAttText = await page.textContent("body");
    expect(page.url()).toContain(`${SCHOOL}/admin/attendance`);
    expect(adminAttText).toContain("Présences");
    expect(adminAttText).toContain("Alice");
    console.log("✅ TEST 3: Admin attendance page shows data");

    // Log out admin
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // ===== TEST 4: PARENT CONSULTS CHILD ATTENDANCE =====
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT1_EMAIL);
    await page.fill('input[type="password"]', parent1Pw);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.goto(`${BASE}/${SCHOOL}/parent/children/${s1.id}/attendance`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const parentAttText = await page.textContent("body");
    expect(parentAttText).toContain("Alice");
    expect(parentAttText).toContain("Présent");
    console.log("✅ TEST 4: Parent attendance page shows child data");

    // ===== TEST 5: PARENT CANNOT SEE WRONG CHILD =====
    await page.goto(`${BASE}/${SCHOOL}/parent/children/${s2.id}`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    const wrongChildUrl = page.url();
    // Should be redirected back to children list
    const blocked = wrongChildUrl.includes("/parent/children") && !wrongChildUrl.includes(s2.id);
    console.log(`  Security check URL: ${wrongChildUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ TEST 5: Parent cannot access another parent's child");

    console.log("\n🎉 ALL 5 TESTS PASSED");
  });
});
