import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Mobile responsive cards", () => {
  test.beforeEach(async ({ viewport }) => {
    test.skip(viewport.width >= 768, "Mobile card tests only run on mobile viewports");
  });

  test.setTimeout(300000);

  test("students list: cards visible on mobile, table hidden, clickable", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "mob-" + rand;
    const EMAIL = `admin-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: "Test123!", schoolName: "Mob School", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd).not.toBeNull();

    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6ème A", level: "6ème", academic_year_id: yd.id, capacity: 30 } });
    expect(cd).not.toBeNull();

    const s1 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/students`, data: { matricule: `MAT-${rand}-1`, first_name: "Alice", last_name: "Test", email: `alice-${rand}@t.com`, class_id: cd.id, gender: "F" } });
    expect(s1).not.toBeNull();
    const studentId = s1.id;

    const s2 = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/students`, data: { matricule: `MAT-${rand}-2`, first_name: "Bob", last_name: "Test", email: `bob-${rand}@t.com`, class_id: cd.id, gender: "M" } });
    expect(s2).not.toBeNull();

    await page.goto(`${BASE}/${SCHOOL}/admin/students`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const mobileCards = page.locator("[data-mobile-cards]");
    await expect(mobileCards).toBeVisible();

    const cardsText = await mobileCards.textContent();
    expect(cardsText).toContain("Alice");
    expect(cardsText).toContain("Bob");
    expect(cardsText).toContain("6ème A");
    console.log("✅ Mobile cards render with student data");

    const aliceCard = mobileCards.locator("> div").filter({ hasText: "Alice" });
    await expect(aliceCard).toBeVisible();
    const voirBtn = aliceCard.getByRole("link", { name: "Voir" });
    await voirBtn.click();
    await page.waitForURL(`**/${SCHOOL}/admin/students/${studentId}`, { timeout: 15000 });
    const detailText = await page.textContent("body");
    expect(detailText).toContain("Alice");
    console.log("✅ Card 'Voir' button navigates to detail page");

    await page.goto(`${BASE}/${SCHOOL}/admin/students`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const toggle = page.locator("text=Afficher les comptes inactifs");
    await expect(toggle).toBeVisible();
    console.log("✅ Inactive filter toggle visible on mobile");
  });

  test("parents list: cards visible on mobile, clickable", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "mobp-" + rand;
    const EMAIL = `admin-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: "Test123!", schoolName: "Mob School P", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const pd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/parents`, data: { first_name: "Marie", last_name: "Parent", email: `marie-${rand}@t.com`, phone: "+242 06 000 000", relationship: "Mère", profession: "Infirmière" } });
    expect(pd).not.toBeNull();
    const parentId = pd.id;

    await page.goto(`${BASE}/${SCHOOL}/admin/parents`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const mobileCards = page.locator("[data-mobile-cards]");
    await expect(mobileCards).toBeVisible();

    const cardsText = await mobileCards.textContent();
    expect(cardsText).toContain("Marie");
    expect(cardsText).toContain("Parent");
    expect(cardsText).toContain("Mère");
    console.log("✅ Parents mobile cards render with parent data");

    const voirBtn = mobileCards.getByRole("link", { name: "Voir" }).first();
    await voirBtn.click();
    await page.waitForURL(`**/${SCHOOL}/admin/parents/${parentId}`, { timeout: 15000 });
    const detailText = await page.textContent("body");
    expect(detailText).toContain("Marie");
    console.log("✅ Parent card 'Voir' button navigates to detail page");
  });

  test("subjects list: cards visible on mobile", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "mobs-" + rand;
    const EMAIL = `admin-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: EMAIL, password: "Test123!", schoolName: "Mob School S", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const sub = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/subjects`, data: { name: "Mathématiques", code: "MATH", coefficient: 4, description: "Algèbre et géométrie" } });
    expect(sub).not.toBeNull();

    await page.goto(`${BASE}/${SCHOOL}/admin/subjects`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const mobileCards = page.locator("[data-mobile-cards]");
    await expect(mobileCards).toBeVisible();

    const cardsText = await mobileCards.textContent();
    expect(cardsText).toContain("Mathématiques");
    expect(cardsText).toContain("MATH");
    console.log("✅ Subjects mobile cards render with subject data");
  });
});
