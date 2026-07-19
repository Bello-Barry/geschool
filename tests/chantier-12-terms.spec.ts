import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 12 — Gestion des trimestres", () => {
  test.setTimeout(300000);

  // ====================================================================
  // TEST 1: Créer année scolaire → 3 trimestres auto-créés
  // ====================================================================
  test("create academic year → 3 trimesters auto-created with correct dates", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "t12-" + rand;
    const EMAIL = `admin-${rand}@test.com`;

    // Register
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: "Test123!", schoolName: "Term School", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    // Navigate to admin
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Create academic year via API
    const yearData = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/academic-years`,
      data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true },
    });
    expect(yearData).not.toBeNull();
    expect(yearData.id).toBeDefined();
    console.log("✅ Academic year created:", yearData.id);

    // Check that 3 terms were auto-created
    const { data: terms, error } = await supabaseAdmin
      .from("terms")
      .select("*")
      .eq("academic_year_id", yearData.id)
      .order("term_number");

    expect(error).toBeNull();
    expect(terms).toHaveLength(3);

    expect(terms![0].name).toBe("Trimestre 1");
    expect(terms![0].term_number).toBe(1);
    expect(terms![0].start_date).toBe("2025-09-15");
    expect(terms![0].is_current).toBe(false);

    expect(terms![1].name).toBe("Trimestre 2");
    expect(terms![1].term_number).toBe(2);
    expect(terms![1].is_current).toBe(false);

    expect(terms![2].name).toBe("Trimestre 3");
    expect(terms![2].term_number).toBe(3);
    expect(terms![2].end_date).toBe("2026-07-15");
    expect(terms![2].is_current).toBe(false);

    // Verify no term is active by default
    const activeTerms = terms!.filter((t) => t.is_current);
    expect(activeTerms).toHaveLength(0);

    console.log("✅ 3 trimesters auto-created, none active by default");
  });

  // ====================================================================
  // TEST 2: Activer Trimestre 1 → is_current=true, others=false
  // ====================================================================
  test("activate Trimestre 1 → only it becomes is_current", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "t12a-" + rand;
    const EMAIL = `admin-${rand}@test.com`;

    // Register + navigate
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: "Test123!", schoolName: "Term School A", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Create academic year (auto-creates 3 terms)
    const yearData = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/academic-years`,
      data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: false },
    });
    expect(yearData).not.toBeNull();

    // Fetch terms
    const { data: terms } = await supabaseAdmin
      .from("terms")
      .select("*")
      .eq("academic_year_id", yearData.id)
      .order("term_number");
    expect(terms).toHaveLength(3);

    const t1Id = terms![0].id;

    // Activate Trimestre 1 via API
    const activateRes = await page.evaluate(async (termId) => {
      const r = await fetch(`/api/terms/${termId}/activate`, { method: "POST" });
      return r.ok ? await r.json() : null;
    }, t1Id);
    expect(activateRes).not.toBeNull();
    expect(activateRes.is_current).toBe(true);

    // Verify in DB
    const { data: check } = await supabaseAdmin
      .from("terms")
      .select("id, is_current")
      .eq("academic_year_id", yearData.id);

    const active = check!.filter((t) => t.is_current);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(t1Id);

    console.log("✅ Trimestre 1 activated, others remain inactive");
  });

  // ====================================================================
  // TEST 3: Fresh school grade entry works after auto-term creation
  // ====================================================================
  test("grade entry works on freshly created school with auto-terms", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "t12g-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;

    // Register
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok;
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Grade School", subdomain: SCHOOL },
    });

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Get schoolId
    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year via UI API (auto-creates terms)
    const yearData = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/academic-years`,
      data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true },
    });
    expect(yearData).not.toBeNull();

    // Fetch the auto-created T1 and activate it
    const { data: t1 } = await supabaseAdmin
      .from("terms")
      .select("id")
      .eq("academic_year_id", yearData.id)
      .eq("term_number", 1)
      .single();
    expect(t1).not.toBeNull();

    await page.evaluate(async (termId) => {
      await fetch(`/api/terms/${termId}/activate`, { method: "POST" });
    }, t1!.id);

    // Create class, subject, teacher, student
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6eme A", level: "6eme", academic_year_id: yearData.id, capacity: 30 } });
    expect(cd).not.toBeNull();

    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Maths", code: "MATH", coefficient: 4 })
      .select("id")
      .single();
    expect(subject).not.toBeNull();

    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });
    expect(td.id).toBeDefined();

    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: td.id, subject_id: subject.id, class_id: cd.id } });

    const std = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Alice", last_name: "Eleve", email: `alice-${rand}@t.com`, class_id: cd.id, gender: "F" },
    });
    expect(std).not.toBeNull();

    // Logout admin, login as teacher
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', td.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // Navigate to grade entry — should NOT show "Aucune période scolaire active"
    await page.goto(`${BASE}/${SCHOOL}/teacher/grades/${cd.id}/${subject.id}`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Should show grade entry form (not the error message)
    await expect(page.locator("text=Saisie des notes").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Alice").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Grade entry page loads on fresh school — no period blockage");

    // Enter grades and verify average
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("14");
    await page.waitForTimeout(500);
    await inputs.nth(1).fill("12");
    await page.waitForTimeout(500);
    await inputs.nth(2).fill("15");
    await page.waitForTimeout(500);

    await expect(page.locator("text=14.00").first()).toBeVisible({ timeout: 3000 });
    console.log("✅ Dynamic average calculated: 14.00");

    // Save
    await page.locator("button").filter({ hasText: "Sauvegarder tout" }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Notes sauvegardées avec succès").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Grades saved successfully on fresh school");
  });

  // ====================================================================
  // TEST 4: Switch activation to Trimestre 2, T1 grades remain
  // ====================================================================
  test("switch to Trimestre 2 → activation works, T1 data persists", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "t12s-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;

    // Register
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok;
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Switch School", subdomain: SCHOOL },
    });

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId = debug?.headers?.["x-school-id"];

    // Create academic year (auto-creates terms)
    const yearData = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/academic-years`,
      data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true },
    });
    expect(yearData).not.toBeNull();

    // Fetch terms
    const { data: terms } = await supabaseAdmin
      .from("terms")
      .select("*")
      .eq("academic_year_id", yearData.id)
      .order("term_number");
    expect(terms).toHaveLength(3);

    const t1Id = terms![0].id;
    const t2Id = terms![1].id;

    // Activate T1
    await page.evaluate(async (termId) => {
      await fetch(`/api/terms/${termId}/activate`, { method: "POST" });
    }, t1Id);

    // Verify T1 is active
    const { data: check1 } = await supabaseAdmin.from("terms").select("is_current").eq("id", t1Id).single();
    expect(check1!.is_current).toBe(true);

    // Create class, subject, teacher, student for grade entry
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "5eme B", level: "5eme", academic_year_id: yearData.id, capacity: 25 } });
    expect(cd).not.toBeNull();

    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Histoire", code: "HIST", coefficient: 3 })
      .select("id")
      .single();

    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Marie", last_name: "Enseignante", email: TEACHER_EMAIL, specialization: "Histoire" },
    });

    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: td.id, subject_id: subject.id, class_id: cd.id } });

    const std = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Bob", last_name: "Etudiant", email: `bob-${rand}@t.com`, class_id: cd.id, gender: "M" },
    });
    expect(std).not.toBeNull();

    // Login as teacher, save a grade under T1
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', td.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    await page.goto(`${BASE}/${SCHOOL}/teacher/grades/${cd.id}/${subject.id}`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill("16");
    await page.waitForTimeout(300);
    await inputs.nth(1).fill("14");
    await page.waitForTimeout(300);
    await inputs.nth(2).fill("18");
    await page.waitForTimeout(300);

    await page.locator("button").filter({ hasText: "Sauvegarder tout" }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Notes sauvegardées avec succès").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ T1 grade saved");

    // Verify the grade is under T1
    const gradesT1 = await page.evaluate(async (studentId) => {
      const r = await fetch(`/api/grades?student_id=${studentId}`);
      return r.ok ? await r.json() : [];
    }, std.id);
    const t1Grade = gradesT1.find((g: any) => g.term_id === t1Id);
    expect(t1Grade).toBeDefined();
    expect(t1Grade.score).toBe(16);
    console.log("✅ T1 grade persisted in DB");

    // Now switch to T2 (via admin client since teacher can't activate terms)
    await supabaseAdmin
      .from("terms")
      .update({ is_current: false })
      .eq("school_id", schoolId)
      .eq("is_current", true);

    const { data: switchRes, error: switchErr } = await supabaseAdmin
      .from("terms")
      .update({ is_current: true })
      .eq("id", t2Id)
      .select()
      .single();

    expect(switchErr).toBeNull();
    expect(switchRes).not.toBeNull();
    expect(switchRes!.is_current).toBe(true);

    // Verify T1 is no longer current
    const { data: t1Check } = await supabaseAdmin.from("terms").select("is_current").eq("id", t1Id).single();
    expect(t1Check!.is_current).toBe(false);

    // Verify T2 is current
    const { data: t2Check } = await supabaseAdmin.from("terms").select("is_current").eq("id", t2Id).single();
    expect(t2Check!.is_current).toBe(true);

    // Verify T1 grades still exist
    const gradesAfterSwitch = await page.evaluate(async (studentId) => {
      const r = await fetch(`/api/grades?student_id=${studentId}`);
      return r.ok ? await r.json() : [];
    }, std.id);
    const t1GradeAfter = gradesAfterSwitch.find((g: any) => g.term_id === t1Id);
    expect(t1GradeAfter).toBeDefined();
    expect(t1GradeAfter.score).toBe(16);
    console.log("✅ T1 grades persist after switching to T2");

    // Verify teacher can now enter grades for T2
    await page.goto(`${BASE}/${SCHOOL}/teacher/grades/${cd.id}/${subject.id}`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Saisie des notes").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Grade entry works under T2");
  });
});
