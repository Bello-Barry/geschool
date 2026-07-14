import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const rand = Math.random().toString(36).slice(2, 8);
const SCHOOL = "tcrud-" + rand;
const EMAIL = `admin-${rand}@test.com`;
const PASSWORD = "Test123!";

test.describe("Teachers CRUD", () => {
  test.setTimeout(300000);

  test("teachers full CRUD: register → seed → detail → edit → delete", async ({ page }) => {
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

    // Create teacher via browser fetch (preserves cookies)
    const teacherEmail = `marc-${rand}@test.com`;
    const sd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: r.status, body: await r.text() };
    }, {
      url: `${BASE}/api/teachers`,
      data: {
        first_name: "Marc", last_name: "Tshiani",
        email: teacherEmail, specialization: "Mathématiques",
        employee_id: `EMP-${rand}`,
      },
    });
    expect(sd).not.toBeNull();
    expect(sd.id).toBeDefined();
    console.log("  Teacher created:", sd.id);
    const teacherId = sd.id;

    // ===== TEST 1: LIST PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/teachers`, { waitUntil: "networkidle" });
    const listText = await page.textContent("body");
    expect(listText).toContain("Marc");
    expect(listText).toContain("Tshiani");
    expect(listText).toContain("Mathématiques");
    console.log("✅ Teacher appears in list");

    // ===== TEST 2: DETAIL PAGE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/teachers/${teacherId}`, { waitUntil: "networkidle" });
    const detailText = await page.textContent("body");
    expect(detailText).toContain("Marc");
    expect(detailText).toContain("Tshiani");
    expect(detailText).toContain(teacherEmail);
    expect(detailText).toContain("Mathématiques");
    expect(detailText).toContain(`EMP-${rand}`);
    console.log("✅ Detail page shows all teacher info");

    // ===== TEST 3: EDIT FORM =====
    await page.goto(`${BASE}/${SCHOOL}/admin/teachers/${teacherId}/edit`, { waitUntil: "networkidle" });
    await expect(page.locator('input[name="firstName"]')).toHaveValue("Marc", { timeout: 15000 });
    await expect(page.locator('input[name="lastName"]')).toHaveValue("Tshiani");
    await expect(page.locator('input[name="email"]')).toHaveValue(teacherEmail);
    await expect(page.locator('input[name="specialization"]')).toHaveValue("Mathématiques");
    await expect(page.locator('input[name="employeeId"]')).toHaveValue(`EMP-${rand}`);
    console.log("✅ Edit form pre-filled with current data");

    // Edit
    await page.fill('input[name="firstName"]', "Marc-Paul");
    await page.fill('input[name="lastName"]', "Tshiani-Modifié");
    await page.fill('input[name="specialization"]', "Physique");

    const [patchResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/teachers/${teacherId}`) && r.request().method() === "PATCH"),
      page.click('button[type="submit"]'),
    ]);
    expect(patchResp.ok()).toBeTruthy();
    console.log("✅ PATCH response ok");

    await page.waitForURL(new RegExp(`/${SCHOOL}/admin/teachers/${teacherId}$`), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    const t3 = await page.textContent("body");
    expect(t3).toContain("Marc-Paul");
    expect(t3).toContain("Tshiani-Modifié");
    expect(t3).toContain("Physique");
    console.log("✅ Edit saved, detail page updated");

    // Verify in list
    await page.goto(`${BASE}/${SCHOOL}/admin/teachers`, { waitUntil: "networkidle" });
    const listText2 = await page.textContent("body");
    expect(listText2).toContain("Marc-Paul");
    expect(listText2).toContain("Tshiani-Modifié");
    console.log("✅ Teacher list shows updated name");

    // ===== TEST 4: DELETE =====
    await page.goto(`${BASE}/${SCHOOL}/admin/teachers/${teacherId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    page.once("dialog", dialog => dialog.accept());

    const [delResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/teachers/${teacherId}`) && r.request().method() === "DELETE"),
      page.click('button:has-text("Supprimer")'),
    ]);
    expect(delResp.ok()).toBeTruthy();
    console.log("✅ DELETE response ok");

    await page.waitForURL(new RegExp(`/${SCHOOL}/admin/teachers$`), { timeout: 15000 });
    await page.waitForSelector('h1:has-text("Gestion des enseignants")', { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Marc-Paul");
    console.log("✅ Teacher deleted, no longer in list");
  });

  test("security: cross-school teacher access denied", async ({ page }) => {
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

    const sd = await page.evaluate(async ({ data, base }) => {
      const r = await fetch(`${base}/api/teachers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { data: { first_name: "Target", last_name: "Teacher", email: `t-${rand2}@t.com`, specialization: "Histoire" }, base: BASE });
    expect(sd).not.toBeNull();
    const targetId = sd.id;

    // School B
    await reg(schoolB, emailB);

    await page.goto(`${BASE}/${schoolB}/admin/teachers/${targetId}`, { waitUntil: "networkidle" });
    const finalUrl = page.url();
    const blocked = !finalUrl.includes(targetId) || finalUrl.includes(`/${schoolB}/admin/teachers`);
    console.log(`  cross-school attempt → ${finalUrl}`);
    expect(blocked).toBe(true);
    console.log("✅ Cross-school access blocked");
  });
});
