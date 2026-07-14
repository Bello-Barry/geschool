import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Report Cards", () => {
  test.setTimeout(120000);

  test("admin generates report card, parent can view and download", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "rpt-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const PARENT_EMAIL = `parent-${rand}@test.com`;
    const STUDENT_EMAIL = `student-${rand}@test.com`;

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
    const academicYearId: string = yd.id;

    // Create class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "5ème B", level: "5ème", academic_year_id: academicYearId, capacity: 30 } });
    expect(cd).not.toBeNull();
    const classId: string = cd.id;

    // Create subject and term via admin client
    const { data: subject, error: subjectErr } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Mathématiques", code: "MATH", coefficient: 4 })
      .select("id")
      .single();
    expect(subjectErr || !subject ? subjectErr : null).toBeNull();
    const subjectId: string = subject!.id;

    const { data: subject2, error: subjectErr2 } = await supabaseAdmin
      .from("subjects")
      .insert({ school_id: schoolId, name: "Français", code: "FR", coefficient: 3 })
      .select("id")
      .single();
    expect(subjectErr2 || !subject2 ? subjectErr2 : null).toBeNull();
    const subjectId2: string = subject2!.id;

    const { data: term, error: termErr } = await supabaseAdmin
      .from("terms")
      .insert({ school_id: schoolId, academic_year_id: academicYearId, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
      .select("id")
      .single();
    expect(termErr || !term ? termErr : null).toBeNull();
    const termId: string = term!.id;

    // Create student
    const sd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Alice", last_name: "Test", email: STUDENT_EMAIL, class_id: classId, gender: "F" },
    });
    expect(sd.id).toBeDefined();
    const studentId: string = sd.id;

    // Create grades
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/grades`, data: { student_id: studentId, subject_id: subjectId, term_id: termId, grade_type: "exam", score: 16, date: "2025-12-01" } });

    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/grades`, data: { student_id: studentId, subject_id: subjectId2, term_id: termId, grade_type: "exam", score: 14, date: "2025-12-01" } });

    // Create parent linked to student
    const pd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await r.text();
      try { return r.ok ? JSON.parse(body) : { error: r.status, body }; } catch { return { error: r.status, body }; }
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Parent", last_name: "Test", email: PARENT_EMAIL, phone: "+242 00 000 000", relationship: "Mère", student_ids: [studentId] },
    });
    expect(pd.id).toBeDefined();

    // Look up parent user_id and set known password via admin client
    const { data: parentRec } = await supabaseAdmin
      .from("parents")
      .select("user_id")
      .eq("id", pd.id)
      .single();
    expect(parentRec).not.toBeNull();
    const parentPassword = "ParentTest123!";
    await supabaseAdmin.auth.admin.updateUserById(parentRec!.user_id, { password: parentPassword });

    // ===== TEST 1: ADMIN GENERATES REPORT CARD =====
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentId}`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Should see the "Bulletins" section with "Générer le bulletin" button
    const pageText = await page.textContent("body");
    expect(pageText).toContain("Bulletins");
    expect(pageText).toContain("Trimestre 1");
    expect(pageText).toContain("Générer le bulletin");

    // Click generate and wait for API response
    const [response] = await Promise.all([
      page.waitForResponse((r: any) => r.url().includes("/api/reports/generate") && r.request().method() === "POST"),
      page.click('button:has-text("Générer le bulletin")'),
    ]);

    const respData = await response.json();
    expect(respData.success).toBeTruthy();
    expect(respData.url).toBeDefined();
    expect(respData.id).toBeDefined();
    const reportId: string = respData.id;
    console.log("  Report card generated:", reportId);

    await page.waitForTimeout(1000);

    // Verify the page now shows "Télécharger" instead of "Générer"
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentId}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const updatedText = await page.textContent("body");
    expect(updatedText).toContain("Télécharger");
    expect(updatedText).not.toContain("Générer le bulletin");

    // ===== TEST 2: DOWNLOAD PDF FROM ADMIN =====
    const downloadResp = await page.evaluate(async (reportId) => {
      const r = await fetch(`/api/reports/download/${reportId}`);
      return { status: r.status, contentType: r.headers.get("content-type"), size: (await r.blob()).size };
    }, reportId);

    expect(downloadResp.status).toBe(200);
    expect(downloadResp.contentType).toBe("application/pdf");
    expect(downloadResp.size).toBeGreaterThan(1000);
    console.log("  PDF downloaded, size:", downloadResp.size);

    // ===== TEST 3: PARENT VIEWS REPORT CARDS =====
    // Log out admin, log in as parent
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);

    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[type="password"]', parentPassword);

    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    // Navigate directly to reports page
    await page.goto(`${BASE}/${SCHOOL}/parent/children/${studentId}/reports`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const reportsText = await page.textContent("body");
    expect(reportsText).toContain("Bulletins");
    expect(reportsText).toContain("Trimestre 1");
    expect(reportsText).toContain("Télécharger");

    // Parent downloads the report
    const parentDownloadResp = await page.evaluate(async (reportId) => {
      const r = await fetch(`/api/reports/download/${reportId}`);
      return { status: r.status, contentType: r.headers.get("content-type"), size: (await r.blob()).size };
    }, reportId);

    expect(parentDownloadResp.status).toBe(200);
    expect(parentDownloadResp.contentType).toBe("application/pdf");
    expect(parentDownloadResp.size).toBeGreaterThan(1000);
    console.log("  Parent PDF download verified, size:", parentDownloadResp.size);

    console.log("  ✅ All report card tests passed");
  });
});
