import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const rand = Math.random().toString(36).slice(2, 8);
const SCHOOL = "ccrud-" + rand;
const EMAIL = `admin-${rand}@test.com`;
const PASSWORD = "Test123!";

test.describe("Classes CRUD", () => {
  test.setTimeout(300000);

  test("classes full CRUD: register → seed → list → detail → edit → delete with student block", async ({ page }) => {
    // ===== SETUP =====
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const regResult = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: r.ok, status: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: PASSWORD, schoolName: "Test School", subdomain: SCHOOL },
    });
    expect(regResult.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });
    expect(page.url()).toContain(`/${SCHOOL}/admin`);

    // Create academic year
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/academic-years`,
      data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true },
    });
    expect(yd).not.toBeNull();

    // Create class
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/classes`,
      data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30, room_number: "R101" },
    });
    expect(cd).not.toBeNull();
    expect(cd.id).toBeDefined();
    console.log("  Class created:", cd.id);
    const classId = cd.id;

    // Create a student in this class
    const studentEmail = `eleve-${rand}@test.com`;
    const student = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Test", last_name: "Student", email: studentEmail, class_id: classId, gender: "M" },
    });
    expect(student.id).toBeDefined();
    console.log("  Student created in class:", student.id);

    // ===== TEST 1: LIST PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/classes`, { waitUntil: "networkidle" });
    const listText = await page.textContent("body");
    expect(listText).toContain("6ème A");
    expect(listText).toContain("R101");
    console.log("✅ Class appears in list");

    // ===== TEST 2: DETAIL PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/classes/${classId}`, { waitUntil: "networkidle" });
    const detailText = await page.textContent("body");
    expect(detailText).toContain("6ème A");
    expect(detailText).toContain("6ème");
    expect(detailText).toContain("R101");
    expect(detailText).toContain("30");
    expect(detailText).toContain("2025-2026");
    console.log("✅ Detail page shows class info");

    // ===== TEST 3: STUDENT LIST ON DETAIL PAGE =====
    expect(detailText).toContain("Test");
    expect(detailText).toContain("Student");
    expect(detailText).toContain("MAT-");
    console.log("✅ Detail page shows students in class");

    // ===== TEST 4: DELETE BLOCKED WITH STUDENT =====
    await page.goto(`${BASE}/${SCHOOL}/admin/classes/${classId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    page.once("dialog", dialog => dialog.accept());

    const [delResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/classes/${classId}`) && r.request().method() === "DELETE"),
      page.click('button:has-text("Supprimer")'),
    ]);
    expect(delResp.status()).toBe(409);
    console.log("✅ Delete blocked with 409 (students still assigned)");

    // Verify error message shown
    await expect(page.locator("body")).toContainText("Impossible de supprimer");
    await expect(page.locator("body")).toContainText("élève");
    console.log("✅ Error message displayed: class has students");

    // ===== TEST 5: EDIT FORM =====
    await page.goto(`${BASE}/${SCHOOL}/admin/classes/${classId}/edit`, { waitUntil: "networkidle" });
    await expect(page.locator('input[name="name"]')).toHaveValue("6ème A", { timeout: 15000 });
    await expect(page.locator('input[name="level"]')).toHaveValue("6ème");
    await expect(page.locator('input[name="capacity"]')).toHaveValue("30");
    await expect(page.locator('input[name="room_number"]')).toHaveValue("R101");
    console.log("✅ Edit form pre-filled with current data");

    // Edit
    await page.fill('input[name="name"]', "6ème B");
    await page.fill('input[name="room_number"]', "R102");

    const [patchResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/classes/${classId}`) && r.request().method() === "PATCH"),
      page.click('button[type="submit"]'),
    ]);
    expect(patchResp.ok()).toBeTruthy();
    console.log("✅ PATCH response ok");

    await page.waitForURL(new RegExp(`/${SCHOOL}/admin/classes/${classId}$`), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    const t3 = await page.textContent("body");
    expect(t3).toContain("6ème B");
    expect(t3).toContain("R102");
    console.log("✅ Edit saved, detail page updated");
  });

  test("security: cross-school class access denied", async ({ page }) => {
    const rand2 = Math.random().toString(36).slice(2, 8);
    const schoolA = "seca-" + rand2;
    const emailA = `seca-${rand2}@test.com`;
    const schoolB = "secb-" + rand2;
    const emailB = `secb-${rand2}@test.com`;

    async function reg(slug: string, email: string) {
      await page.goto(`${BASE}/register`, { waitUntil: "load" });
      const r = await page.evaluate(async ({ data, base }) => {
        const resp = await fetch(`${base}/api/auth/register`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        return resp.ok;
      }, { data: { firstName: "Admin", lastName: "Test", email, password: PASSWORD, schoolName: "S", subdomain: slug }, base: BASE });
      expect(r).toBeTruthy();
      await page.goto(`${BASE}/${slug}/admin`, { waitUntil: "networkidle" });
      expect(page.url()).toContain(`/${slug}/admin`);
    }

    // School A
    await reg(schoolA, emailA);

    const yr = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/academic-years`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true }, base: BASE });

    const cd = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/classes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { name: "Target Class", level: "6ème", academic_year_id: yr.id, capacity: 30 }, base: BASE });
    expect(cd).not.toBeNull();
    const targetId = cd.id;

    // School B
    await reg(schoolB, emailB);

    await page.goto(`${BASE}/${schoolB}/admin/classes/${targetId}`, { waitUntil: "networkidle" });
    const finalUrl = page.url();
    const blocked = !finalUrl.includes(targetId) || finalUrl.includes(`/${schoolB}/admin/classes`);
    console.log(`  cross-school attempt → ${finalUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ Cross-school access blocked");
  });
});
