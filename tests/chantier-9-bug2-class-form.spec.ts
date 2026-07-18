import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Bug 2 — Class creation via UI form", () => {
  test.setTimeout(120000);

  test("create class via new class page form", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "bug2b-" + rand;
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

    // Get school ID
    const debug = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE);
    const schoolId = debug?.headers?.["x-school-id"];
    expect(schoolId).toBeDefined();

    // Create academic year directly via admin client
    const { data: yd } = await supabaseAdmin
      .from("academic_years")
      .insert({ school_id: schoolId, name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true })
      .select("id")
      .single();
    expect(yd).not.toBeNull();

    // Navigate to new class page
    await page.goto(`${BASE}/${SCHOOL}/admin/classes/new`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Fill the form
    await page.fill('input[placeholder="6ème A"]', "6eme B");
    await page.fill('input[placeholder="6ème"]', "6eme");
    await page.fill('input[placeholder="30"]', "25");
    await page.fill('input[placeholder="R101"]', "Salle 101");

    // Academic year is pre-selected with current year (defaultValue)

    // Submit
    await page.click('button:has-text("Créer la classe")');
    await page.waitForTimeout(3000);

    // Should redirect to classes list
    expect(page.url()).toContain(`/${SCHOOL}/admin/classes`);
    await expect(page.locator("text=6eme B").first()).toBeVisible({ timeout: 5000 });
    console.log("OK Class created via UI form without crash");
  });
});
