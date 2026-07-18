import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Bug 2 — Classe creation crash", () => {
  test.setTimeout(120000);

  test("create class via API and verify no crash", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "bug2-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;

    // Register school
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

    // Get school info
    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : { error: await r.text() };
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    expect(yd.id).toBeDefined();

    // Create class via API (same as the form does)
    const classResult = await page.evaluate(async ({ url, data }) => {
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const text = await r.text();
        let json;
        try { json = JSON.parse(text); } catch { json = { raw: text }; }
        return { ok: r.ok, status: r.status, body: json };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }, {
      url: `${BASE}/api/classes`,
      data: { name: "6eme A", level: "6eme", academic_year_id: yd.id, capacity: 30 },
    });
    expect(classResult.ok).toBeTruthy();
    expect(classResult.body.id).toBeDefined();
    console.log("OK Class created without crash");

    // Verify class is listed on admin page
    await page.goto(`${BASE}/${SCHOOL}/admin/classes`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await expect(page.locator("text=6eme A").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Class appears in list");

    // Verify detail page loads
    const classId = classResult.body.id;
    await page.goto(`${BASE}/${SCHOOL}/admin/classes/${classId}`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await expect(page.locator("text=6eme A").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Detail page loads without crash");
  });
});
