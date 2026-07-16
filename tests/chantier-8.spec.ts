import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 8 — Désactivation de comptes (is_active)", () => {
  test.setTimeout(240000);

  test("désactivation élève, historique, refus connexion, réactivation, pattern enseignant", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "des-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const STUDENT_EMAIL = `s1-${rand}@test.com`;
    const TEACHER_EMAIL = `t1-${rand}@test.com`;
    const PARENT_EMAIL = `p1-${rand}@test.com`;
    const USER_PW = "TestPass123!";

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

    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId: string = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Academic year
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd).not.toBeNull();

    // Term
    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: yd.id, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
      .select("id")
      .single();
    expect(term).not.toBeNull();
    const termId: string = term!.id;

    // Class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();
    const classId: string = cd.id;

    // Subject
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH", coefficient: 4 })
      .select("id")
      .single();
    expect(subject).not.toBeNull();
    const subjectId: string = subject!.id;

    // Teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Paul", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });
    expect(td.id).toBeDefined();

    const { data: teacherRec } = await supabaseAdmin.from("teachers").select("user_id").eq("id", td.id).single();
    expect(teacherRec).not.toBeNull();
    const teacherUserId: string = teacherRec!.user_id;
    await supabaseAdmin.auth.admin.updateUserById(teacherUserId, { password: USER_PW });

    // Assign teacher
    const tsd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/teacher-subjects`, data: { teacher_id: td.id, subject_id: subjectId, class_id: classId } });
    expect(tsd).not.toBeNull();

    // Student
    const s1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Alice", last_name: "Test", email: STUDENT_EMAIL, class_id: classId, gender: "F" },
    });
    expect(s1).not.toBeNull();
    const studentId: string = s1.id;

    const { data: studentRec } = await supabaseAdmin.from("students").select("user_id").eq("id", studentId).single();
    expect(studentRec).not.toBeNull();
    const studentUserId: string = studentRec!.user_id;
    await supabaseAdmin.auth.admin.updateUserById(studentUserId, { password: USER_PW });

    // Parent
    const p1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status };
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Marie", last_name: "Mere", email: PARENT_EMAIL, phone: "+242 00 000 001", relationship: "Mère", student_ids: [studentId] },
    });
    expect(p1.id).toBeDefined();

    // Grade for history test
    const gradeRes = await page.evaluate(async ({ base, data }) => {
      const r = await fetch(`${base}/api/grades`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      return { ok: r.ok };
    }, { base: BASE, data: { student_id: studentId, subject_id: subjectId, term_id: termId, grade_type: "exam", score: 15, date: "2025-12-01" } });
    expect(gradeRes.ok).toBeTruthy();

    // ====================================================================
    // TEST 1: Désactiver → disparaît liste → apparaît avec filtre inactifs
    // ====================================================================
    // Deactivate student via admin client
    await supabaseAdmin.from("users").update({ is_active: false }).eq("id", studentUserId);

    // Go to students list — Alice should NOT be visible by default
    await page.goto(`${BASE}/${SCHOOL}/admin/students`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    let listText = await page.textContent("body");
    expect(listText).not.toContain("Alice Test");

    // Check "Afficher les comptes inactifs" checkbox — click the label text
    await page.locator("text=Afficher les comptes inactifs").click();
    await page.waitForTimeout(2000);

    // Alice should now appear with Inactif badge
    await expect(page.locator("text=Alice Test")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Inactif", { exact: true })).toBeVisible({ timeout: 5000 });

    console.log("✅ TEST 1: Élève désactivé → disparaît de la liste → réapparaît avec filtre inactifs");

    // ====================================================================
    // TEST 2: Historique (notes) toujours consultable
    // ====================================================================
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentId}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const detailText = await page.textContent("body");
    expect(detailText).toContain("Alice");
    expect(detailText).toContain("Dernières notes");
    expect(detailText).toContain("15/20");
    // Badge should show Inactif on detail page
    expect(detailText).toContain("Inactif");

    console.log("✅ TEST 2: Notes et page détail toujours consultables après désactivation");

    // ====================================================================
    // TEST 3: Connexion refusée avec message clair
    // ====================================================================
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const loginPageUrl = page.url();
    expect(loginPageUrl).toContain("/login");
    const loginPageText = await page.textContent("body");
    // The toast should have been shown; check the page still shows login form
    expect(loginPageText).toContain("Se connecter");
    // The toast "Compte désactivé" should have appeared
    const toastVisible = await page.getByText("Compte désactivé", { exact: true }).isVisible().catch(() => false);
    expect(toastVisible).toBe(true);

    console.log("✅ TEST 3: Connexion refusée avec message 'Compte désactivé'");

    // ====================================================================
    // TEST 4: Réactivation → reconnexion possible
    // ====================================================================
    // Reactivate student via admin client directly (no admin UI login needed)
    await supabaseAdmin.from("users").update({ is_active: true }).eq("id", studentUserId);

    // Clear stale cookies
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Login as student — should work now
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Verify we're no longer on the login page (content check is more reliable than URL)
    const loginForm = page.locator('button:has-text("Se connecter")');
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });

    console.log("✅ TEST 4: Réactivation → connexion réussie");

    // ====================================================================
    // TEST 5: Pattern identique pour un enseignant
    // ====================================================================
    // Logout student
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Verify teacher is active
    const { data: teacherActive } = await supabaseAdmin.from("users").select("is_active").eq("id", teacherUserId).single();
    expect(teacherActive?.is_active).toBe(true);

    // Deactivate teacher
    await supabaseAdmin.from("users").update({ is_active: false }).eq("id", teacherUserId);

    // Try login as teacher — should be refused
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const teacherLoginUrl = page.url();
    expect(teacherLoginUrl).toContain("/login");
    const teacherToastVisible = await page.getByText("Compte désactivé", { exact: true }).isVisible().catch(() => false);
    expect(teacherToastVisible).toBe(true);

    // Reactivate teacher via admin client directly
    await supabaseAdmin.from("users").update({ is_active: true }).eq("id", teacherUserId);

    // Clear stale cookies
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });

    // Login as teacher — should work now
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', USER_PW);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Verify teacher dashboard is shown
    const teacherLoginForm = page.locator('button:has-text("Se connecter")');
    await expect(teacherLoginForm).not.toBeVisible({ timeout: 5000 });

    console.log("✅ TEST 5: Pattern enseignant — désactivation + refus connexion + réactivation OK");

    console.log("\n🎉 ALL 5 TESTS PASSED");
  });
});
