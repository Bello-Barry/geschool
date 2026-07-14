import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const rand = Math.random().toString(36).slice(2, 8);
const SCHOOL = "tcrud-" + rand;
const EMAIL = `admin-${rand}@test.com`;
const PASSWORD = "Test123!";

test.describe("Students CRUD", () => {
  test.setTimeout(300000);

  test("students full CRUD: register → seed → detail → edit → delete", async ({ page }) => {
    // ===== SETUP =====
    // Register via browser fetch so cookies are stored in browser context
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

    // Navigate to admin — middleware should now redirect to dashboard
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });
    expect(page.url()).toContain(`/${SCHOOL}/admin`);

    // Create academic year via browser fetch (preserves cookies)
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/academic-years`,
      data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true },
    });
    expect(yd).not.toBeNull();
    expect(yd.id).toBeDefined();
    console.log("  Academic year created:", yd.id);

    // Create class via browser fetch
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/classes`,
      data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 },
    });
    expect(cd).not.toBeNull();
    expect(cd.id).toBeDefined();
    console.log("  Class created:", cd.id);

    // Create student via browser fetch
    const studentEmail = `jean-${rand}@test.com`;
    const sd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/students`,
      data: {
        matricule: `MAT-${rand}`,
        first_name: "Jean", last_name: "Dupont",
        email: studentEmail, class_id: cd.id,
        date_of_birth: "2010-05-15", place_of_birth: "Brazzaville", gender: "M",
      },
    });
    expect(sd).not.toBeNull();
    expect(sd.id).toBeDefined();
    console.log("  Student created:", sd.id);
    const studentId = sd.id;

    // ===== TEST 1: DETAIL PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentId}`, { waitUntil: "networkidle" });
    const t1 = await page.textContent("body");
    expect(t1).toContain("Jean");
    expect(t1).toContain("Dupont");
    expect(t1).toContain("MAT-");
    expect(t1).toContain("Brazzaville");
    console.log("✅ Detail page shows all student info");

    // ===== TEST 2: EDIT FORM =====
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentId}/edit`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const fnVal = await page.inputValue('input[name="firstName"]');
    const lnVal = await page.inputValue('input[name="lastName"]');
    const emVal = await page.inputValue('input[name="email"]');
    expect(fnVal).toBe("Jean");
    expect(lnVal).toBe("Dupont");
    expect(emVal).toBe(studentEmail);
    console.log("✅ Edit form pre-filled with current data");

    // Edit — change first & last name
    await page.fill('input[name="firstName"]', "Jean-Michel");
    await page.fill('input[name="lastName"]', "Dupont-Modifié");

    // Submit — wait for the PATCH response
    const [patchResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/students/${studentId}`) && r.request().method() === "PATCH"),
      page.click('button[type="submit"]'),
    ]);
    expect(patchResp.ok()).toBeTruthy();
    console.log("✅ PATCH response ok");

    // Should redirect back to detail page
    await page.waitForURL(`**/${SCHOOL}/admin/students/${studentId}`, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    const t3 = await page.textContent("body");
    expect(t3).toContain("Jean-Michel");
    expect(t3).toContain("Dupont-Modifié");
    console.log("✅ Edit saved, detail page updated");

    // Check student list reflects changes
    await page.goto(`${BASE}/${SCHOOL}/admin/students`, { waitUntil: "networkidle" });
    const listText = await page.textContent("body");
    expect(listText).toContain("Jean-Michel");
    expect(listText).toContain("Dupont-Modifié");
    console.log("✅ Student list shows updated name");

    // ===== TEST 3: DELETE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/students/${studentId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Handle confirmation dialog
    page.once("dialog", dialog => dialog.accept());

    const [delResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/students/${studentId}`) && r.request().method() === "DELETE"),
      page.click('button:has-text("Supprimer")'),
    ]);
    expect(delResp.ok()).toBeTruthy();
    console.log("✅ DELETE response ok");

    // Should redirect back to student list
    await page.waitForURL(new RegExp(`/${SCHOOL}/admin/students$`), { timeout: 15000 });
    await page.waitForSelector('h1:has-text("Gestion des élèves")', { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Jean-Michel");
    console.log("✅ Student deleted, no longer in list");
  });

  test("security: cross-school student access denied", async ({ page }) => {
    const rand2 = Math.random().toString(36).slice(2, 8);
    const schoolA = "seca-" + rand2;
    const emailA = `seca-${rand2}@test.com`;
    const schoolB = "secb-" + rand2;
    const emailB = `secb-${rand2}@test.com`;

    async function registerAndNavigate(slug, email) {
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

    // Register as school A, create a student
    await registerAndNavigate(schoolA, emailA);

    const yd = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/academic-years`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true }, base: BASE });
    expect(yd).not.toBeNull();

    const cd = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/classes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 }, base: BASE });
    expect(cd).not.toBeNull();

    const sd = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { matricule: `MAT-${rand2}`, first_name: "Target", last_name: "Student", email: `t-${rand2}@t.com`, class_id: cd.id, gender: "M" }, base: BASE });
    expect(sd).not.toBeNull();
    const targetId = sd.id;

    // Register as school B, try to access A's student
    await registerAndNavigate(schoolB, emailB);

    await page.goto(`${BASE}/${schoolB}/admin/students/${targetId}`, { waitUntil: "networkidle" });
    const finalUrl = page.url();
    const blocked = !finalUrl.includes(targetId) || finalUrl.includes(`/${schoolB}/admin/students`);
    console.log(`  cross-school attempt → ${finalUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ Cross-school access blocked");
  });
});
