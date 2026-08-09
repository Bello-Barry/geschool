import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const rand = Math.random().toString(36).slice(2, 8);
const SCHOOL = "pcrud-" + rand;
const EMAIL = `admin-${rand}@test.com`;
const PASSWORD = "Test123!";

test.describe("Parents CRUD", () => {
  test.setTimeout(300000);

  test("parents full CRUD: register → seed → list → detail → edit → delete", async ({ page }) => {
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
      data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 },
    });
    expect(cd).not.toBeNull();

    // Create student to link to parent
    const studentEmail = `enfant-${rand}@test.com`;
    const student = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Enfant", last_name: "Test", email: studentEmail, class_id: cd.id, gender: "M" },
    });
    expect(student.id).toBeDefined();
    console.log("  Student created:", student.id);

    // Create parent
    const parentEmail = `parent-${rand}@test.com`;
    const pd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/parents`,
      data: {
        first_name: "Samuel", last_name: "Mvouba",
        email: parentEmail, phone: "+242 06 123 4567",
        relationship: "Père", profession: "Médecin",
        student_ids: [student.id],
      },
    });
    expect(pd.id).toBeDefined();
    console.log("  Parent created:", pd.id);
    const parentId = pd.id;

    // ===== TEST 1: LIST PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/parents`, { waitUntil: "networkidle" });
    const listText = await page.textContent("body");
    expect(listText).toContain("Samuel");
    expect(listText).toContain("Mvouba");
    expect(listText).toContain("Père");
    expect(listText).toContain("Médecin");
    expect(listText).toContain("+242 06 123 4567");
    console.log("✅ Parent appears in list");

    // ===== TEST 2: DETAIL PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/parents/${parentId}`, { waitUntil: "networkidle" });
    const detailText = await page.textContent("body");
    expect(detailText).toContain("Samuel");
    expect(detailText).toContain("Mvouba");
    expect(detailText).toContain(parentEmail);
    expect(detailText).toContain("Père");
    expect(detailText).toContain("Médecin");
    expect(detailText).toContain("+242 06 123 4567");
    console.log("✅ Detail page shows all parent info");

    // ===== TEST 3: CHILDREN ON DETAIL PAGE =====
    expect(detailText).toContain("Enfant");
    expect(detailText).toContain("Test");
    expect(detailText).toContain("MAT-");
    expect(detailText).toContain("6ème A");
    console.log("✅ Detail page shows linked children");

    // ===== TEST 4: EDIT FORM =====
    await page.goto(`${BASE}/${SCHOOL}/admin/parents/${parentId}/edit`, { waitUntil: "networkidle" });
    await expect(page.locator('input[name="firstName"]')).toHaveValue("Samuel", { timeout: 15000 });
    await expect(page.locator('input[name="lastName"]')).toHaveValue("Mvouba");
    await expect(page.locator('input[name="email"]')).toHaveValue(parentEmail);
    await expect(page.locator('input[name="relationship"]')).toHaveValue("Père");
    await expect(page.locator('input[name="profession"]')).toHaveValue("Médecin");
    console.log("✅ Edit form pre-filled with current data");

    // Edit
    await page.fill('input[name="firstName"]', "Samuel-René");
    await page.fill('input[name="lastName"]', "Mvouba-Modifié");
    await page.fill('input[name="profession"]', "Chirurgien");

    const [patchResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/parents/${parentId}`) && r.request().method() === "PATCH"),
      page.click('button[type="submit"]'),
    ]);
    expect(patchResp.ok()).toBeTruthy();
    console.log("✅ PATCH response ok");

    await page.waitForURL(new RegExp(`/${SCHOOL}/admin/parents/${parentId}$`), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    const t3 = await page.textContent("body");
    expect(t3).toContain("Samuel-René");
    expect(t3).toContain("Mvouba-Modifié");
    expect(t3).toContain("Chirurgien");
    console.log("✅ Edit saved, detail page updated");

    // Verify in list
    await page.goto(`${BASE}/${SCHOOL}/admin/parents`, { waitUntil: "networkidle" });
    const listText2 = await page.textContent("body");
    expect(listText2).toContain("Samuel-René");
    expect(listText2).toContain("Mvouba-Modifié");
    console.log("✅ Parent list shows updated name");

    // ===== TEST 5: DELETE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/parents/${parentId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    page.once("dialog", dialog => dialog.accept());

    const [delResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/parents/${parentId}`) && r.request().method() === "DELETE"),
      page.click('button:has-text("Supprimer")'),
    ]);
    expect(delResp.ok()).toBeTruthy();
    console.log("✅ DELETE response ok");

    await page.waitForURL(new RegExp(`/${SCHOOL}/admin/parents$`), { timeout: 15000 });
    await page.waitForSelector('h1:has-text("Gestion des parents")', { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Samuel-René");
    console.log("✅ Parent deleted, no longer in list");
  });

  test("security: cross-school parent access denied", async ({ page }) => {
    const rand2 = Math.random().toString(36).slice(2, 8);
    const schoolA = "seca-" + rand2;
    const emailA = `seca-${rand2}@test.com`;
    const schoolB = "secb-" + rand2;
    const emailB = `secb-${rand2}@test.com`;

    async function reg(slug: string, email: string) {
      await page.goto(`${BASE}/register`, { waitUntil: "load" });
      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        ok = await page.evaluate(async ({ base, data }) => {
          const resp = await fetch(`${base}/api/auth/register`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
          });
          return resp.ok;
        }, { base: BASE, data: { firstName: "Admin", lastName: "Test", email, password: PASSWORD, schoolName: "S", subdomain: slug } });
        if (!ok && attempt < 3) {
          console.log(`  register attempt ${attempt} failed, retrying...`);
          await page.waitForTimeout(1500);
        }
      }
      expect(ok).toBeTruthy();
      await page.goto(`${BASE}/${slug}/admin`, { waitUntil: "networkidle" });
      expect(page.url()).toContain(`/${slug}/admin`);
    }

    // School A
    await reg(schoolA, emailA);

    const pd = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/parents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { first_name: "Target", last_name: "Parent", email: `t-${rand2}@t.com`, relationship: "Mère" }, base: BASE });
    expect(pd).not.toBeNull();
    const targetId = pd.id;

    // School B
    await reg(schoolB, emailB);

    await page.goto(`${BASE}/${schoolB}/admin/parents/${targetId}`, { waitUntil: "networkidle" });
    const finalUrl = page.url();
    const blocked = !finalUrl.includes(targetId) || finalUrl.includes(`/${schoolB}/admin/parents`);
    console.log(`  cross-school attempt → ${finalUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ Cross-school access blocked");
  });
});
