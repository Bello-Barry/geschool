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
  await page.goto(`${BASE}/${schoolSlug}/login`, { waitUntil: "load" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}

test.describe("Chantier coefficients variables par (matière, classe)", () => {
  test.setTimeout(300000);

  async function setupSchool(page: any, rand: string, label: string) {
    const SCHOOL = `vcc${label}-${rand}`;
    const ADMIN_EMAIL = `admvcc${label}-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(
      async ({ url, data }: { url: string; data: any }) => {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { ok: r.ok, status: r.status, body: await r.text() };
      },
      {
        url: `${BASE}/api/auth/register`,
        data: {
          firstName: "Admin", lastName: label, email: ADMIN_EMAIL, password: "Test123!",
          schoolName: `School ${label}`, subdomain: SCHOOL,
        },
      }
    );
    expect(reg.ok, JSON.stringify(reg)).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("subdomain", SCHOOL)
      .single();
    expect(school).not.toBeNull();

    const { data: ay } = await supabaseAdmin
      .from("academic_years")
      .insert({
        school_id: school!.id,
        name: "2025-2026", start_date: "2025-09-01", end_date: "2026-07-31", is_current: true,
      })
      .select("id")
      .single();
    expect(ay).not.toBeNull();

    return { SCHOOL, ADMIN_EMAIL, schoolId: school!.id, academicYearId: ay!.id };
  }

  test("1. Coefficient par classe : formulaire, liste, édition et moyenne générale selon la série", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "1a");

    // Classes (séries)
    const tleC = await createEntity(page, `${BASE}/api/classes`, { name: "Tle C", level: "Terminale", academic_year_id: ayId });
    const tleA = await createEntity(page, `${BASE}/api/classes`, { name: "Tle A", level: "Terminale", academic_year_id: ayId });
    expect(tleC).not.toBeNull();
    expect(tleA).not.toBeNull();

    // Matières
    const maths = await createEntity(page, `${BASE}/api/subjects`, { name: "Mathématiques", coefficient: 4 });
    const francais = await createEntity(page, `${BASE}/api/subjects`, { name: "Français", coefficient: 3 });
    expect(maths).not.toBeNull();
    expect(francais).not.toBeNull();

    // Professeur de maths
    const teacherEmail = `teachervcc1a-${rand}@test.com`;
    const teacher = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Math", last_name: "Teacher", email: teacherEmail,
      specialization: "Maths", password: "Test123!",
    });
    expect(teacher).not.toBeNull();

    // ===== Création d'affectations via le formulaire avec coefficient par classe =====
    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);

    async function createAffectation(subjectName: string, className: string, coeff: string) {
      await page.goto(`${BASE}/${SCHOOL}/admin/assignments/new`, { waitUntil: "networkidle" });
      await page.click('text=Sélectionner un enseignant');
      await page.getByRole("option", { name: "Math Teacher" }).click();
      await page.click('text=Sélectionner une matière');
      await page.getByRole("option", { name: subjectName }).click();
      await page.click('text=Sélectionner une classe');
      await page.getByRole("option", { name: className }).click();
      await page.fill('input[name="coefficient"]', coeff);
      await page.click('text=Créer l\'affectation');
      await page.waitForURL(new RegExp(`${SCHOOL}/admin/assignments$`), { timeout: 15000 });
    }

    await createAffectation("Mathématiques", "Tle C", "5");
    await createAffectation("Mathématiques", "Tle A", "2");

    // La liste admin montre le coefficient par classe
    await page.goto(`${BASE}/${SCHOOL}/admin/assignments`, { waitUntil: "networkidle" });
    const tleCRow = page.locator('tr', { hasText: "Tle C" });
    const tleARow = page.locator('tr', { hasText: "Tle A" });
    await expect(tleCRow).toContainText("5");
    await expect(tleARow).toContainText("2");

    // Élèves
    const studentC = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-c`, first_name: "Jean", last_name: "SerieC",
      email: `studentvcc1c-${rand}@test.com`, class_id: tleC.id, password: "Test123!",
    });
    const studentA = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-a`, first_name: "Marie", last_name: "SerieA",
      email: `studentvcc1a-${rand}@test.com`, class_id: tleA.id, password: "Test123!",
    });
    expect(studentC).not.toBeNull();
    expect(studentA).not.toBeNull();

    // Terme actif
    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: ayId, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
      .select("id")
      .single();
    expect(term).not.toBeNull();

    // Mêmes notes brutes pour les deux élèves (exam uniquement)
    async function addBatch(studentId: string, subjectId: string, exam: number) {
      const r = await page.evaluate(async ({ url, data }: { url: string; data: any }) => {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        return { ok: res.ok, body: await res.json() };
      }, {
        url: `${BASE}/api/grades/batch`,
        data: { student_id: studentId, subject_id: subjectId, term_id: term!.id, grades: [{ grade_type: "exam", score: exam }] },
      });
      expect(r.ok).toBeTruthy();
    }
    await addBatch(studentC.id, maths.id, 15);
    await addBatch(studentC.id, francais.id, 12);
    await addBatch(studentA.id, maths.id, 15);
    await addBatch(studentA.id, francais.id, 12);

    // Moyennes générales : la même note brute donne un résultat différent selon la série.
    // Maths coeff 5 en Tle C, 2 en Tle A ; Français reste au coeff générique 3 (pas d'affectation spécifique ici).
    const { data: avgC } = await supabaseAdmin.rpc("calculate_general_average", { p_student_id: studentC.id, p_term_id: term!.id });
    const { data: avgA } = await supabaseAdmin.rpc("calculate_general_average", { p_student_id: studentA.id, p_term_id: term!.id });
    // Tle C : (7.5×5 + 6×3)/8 = 6.9375 → 6.94 ; Tle A : (7.5×2 + 6×3)/5 = 6.6
    expect(Number(avgC)).toBeCloseTo(6.94, 2);
    expect(Number(avgA)).toBeCloseTo(6.6, 2);
    expect(Number(avgC)).not.toBeCloseTo(Number(avgA), 2);

    // Le coefficient lu par la base pour la paire (élève, matière) est bien 5 / 2
    const { data: coeffC } = await supabaseAdmin.rpc("get_subject_coefficient", { p_student_id: studentC.id, p_subject_id: maths.id });
    const { data: coeffA } = await supabaseAdmin.rpc("get_subject_coefficient", { p_student_id: studentA.id, p_subject_id: maths.id });
    expect(Number(coeffC)).toBe(5);
    expect(Number(coeffA)).toBe(2);

    // ===== Édition : modifier le coefficient de Tle C (5 → 6) =====
    const { data: assignC } = await supabaseAdmin
      .from("teacher_subjects")
      .select("id")
      .eq("subject_id", maths.id)
      .eq("class_id", tleC.id)
      .single();
    expect(assignC).not.toBeNull();

    await page.goto(`${BASE}/${SCHOOL}/admin/assignments/${assignC!.id}/edit`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Modifier l'affectation" })).toBeVisible();
    await page.fill('input[name="coefficient"]', "6");
    await page.click('text=Enregistrer les modifications');
    await page.waitForURL(new RegExp(`${SCHOOL}/admin/assignments$`), { timeout: 15000 });

    await expect(page.locator('tr', { hasText: "Tle C" })).toContainText("6");

    // La moyenne de Tle C doit être recalculée avec coeff 6 → (7.5×6 + 6×3)/9 = 7.0
    const { data: avgC2 } = await supabaseAdmin.rpc("calculate_general_average", { p_student_id: studentC.id, p_term_id: term!.id });
    expect(Number(avgC2)).toBeCloseTo(7.0, 2);

    // ===== Bulletin généré : la moyenne enregistrée correspond à la série =====
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentC.id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const [response] = await Promise.all([
      page.waitForResponse((r: any) => r.url().includes("/api/reports/generate") && r.request().method() === "POST"),
      page.click('button:has-text("Générer le bulletin")'),
    ]);
    const respData = await response.json();
    expect(respData.success).toBeTruthy();

    const { data: reportC } = await supabaseAdmin
      .from("report_cards")
      .select("general_average")
      .eq("student_id", studentC.id)
      .eq("term_id", term!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(reportC).not.toBeNull();
    expect(Number(reportC!.general_average)).toBeCloseTo(7.0, 2);

    console.log("✅ Test 1 passed (coefficient par classe → moyenne par série)");
  });

  test("2. Rétrocompatibilité : affectation sans coefficient utilise subjects.coefficient", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const { SCHOOL, ADMIN_EMAIL, schoolId, academicYearId: ayId } = await setupSchool(page, rand, "2a");

    const classA = await createEntity(page, `${BASE}/api/classes`, { name: "Tle D", level: "Terminale", academic_year_id: ayId });
    const subjectA = await createEntity(page, `${BASE}/api/subjects`, { name: "Mathématiques", coefficient: 4 });
    expect(classA).not.toBeNull();
    expect(subjectA).not.toBeNull();

    const teacher = await createEntity(page, `${BASE}/api/teachers`, {
      first_name: "Math", last_name: "Teacher", email: `teachervcc2a-${rand}@test.com`,
      specialization: "Maths", password: "Test123!",
    });
    expect(teacher).not.toBeNull();

    // Affectation SANS coefficient explicite (champ vide → null → repli sur la matière)
    await loginAs(page, ADMIN_EMAIL, "Test123!", SCHOOL);
    await page.goto(`${BASE}/${SCHOOL}/admin/assignments/new`, { waitUntil: "networkidle" });
    await page.click('text=Sélectionner un enseignant');
    await page.getByRole("option", { name: "Math Teacher" }).click();
    await page.click('text=Sélectionner une matière');
    await page.getByRole("option", { name: "Mathématiques" }).click();
    await page.click('text=Sélectionner une classe');
    await page.getByRole("option", { name: "Tle D" }).click();
    await page.fill('input[name="coefficient"]', "");
    await page.click('text=Créer l\'affectation');
    await page.waitForURL(new RegExp(`${SCHOOL}/admin/assignments$`), { timeout: 15000 });

    // L'affectation est bien enregistrée avec coefficient NULL
    const { data: assign } = await supabaseAdmin
      .from("teacher_subjects")
      .select("coefficient")
      .eq("subject_id", subjectA.id)
      .eq("class_id", classA.id)
      .single();
    expect(assign).not.toBeNull();
    expect(assign!.coefficient).toBeNull();

    const student = await createEntity(page, `${BASE}/api/students`, {
      matricule: `STU-${rand}-d`, first_name: "Retro", last_name: "Compat",
      email: `studentvcc2a-${rand}@test.com`, class_id: classA.id, password: "Test123!",
    });
    expect(student).not.toBeNull();

    const { data: term } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: ayId, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
      .select("id")
      .single();
    expect(term).not.toBeNull();

    // Note 15/20 en maths
    const r = await page.evaluate(async ({ url, data }: { url: string; data: any }) => {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: res.ok };
    }, {
      url: `${BASE}/api/grades/batch`,
      data: { student_id: student.id, subject_id: subjectA.id, term_id: term!.id, grades: [{ grade_type: "exam", score: 15 }] },
    });
    expect(r.ok).toBeTruthy();

    // Repli : coefficient = 4 (subjects.coefficient), moyenne = (7.5×4)/4 = 7.5
    const { data: coeff } = await supabaseAdmin.rpc("get_subject_coefficient", { p_student_id: student.id, p_subject_id: subjectA.id });
    expect(Number(coeff)).toBe(4);

    const { data: avg } = await supabaseAdmin.rpc("calculate_general_average", { p_student_id: student.id, p_term_id: term!.id });
    expect(Number(avg)).toBeCloseTo(7.5, 2);

    console.log("✅ Test 2 passed (rétrocompatibilité)");
  });
});
