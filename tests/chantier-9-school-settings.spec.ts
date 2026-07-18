import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Bug 1 — Parametres ecole PATCH .single()", () => {
  test.setTimeout(120000);

  test("modify school settings and persist after reload", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "bug1-" + rand;
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

    // Go to school settings page
    await page.goto(`${BASE}/${SCHOOL}/admin/school`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Modify fields
    await page.fill('input[placeholder="+242 06 123 4567"]', "+242 06 000 001");
    await page.fill('input[type="email"]', "contact@ecole.cg");
    await page.fill('input[placeholder="Brazzaville, Congo"]', "Pointe-Noire, Congo");

    // Change color using evaluate (fill unsupported for color inputs)
    await page.evaluate(() => {
      const el = document.querySelector('input[type="color"]') as HTMLInputElement;
      if (el) { el.value = "#FF0000"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    await page.waitForTimeout(500);

    // Save
    await page.click('button:has-text("Enregistrer")');
    await page.waitForTimeout(2000);

    // No error toast
    const errorToast = page.locator('[role="alert"][data-variant="destructive"]');
    await expect(errorToast).not.toBeVisible({ timeout: 3000 });

    // Reload and verify persistence
    await page.goto(`${BASE}/${SCHOOL}/admin/school`, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const phoneInput = page.locator('input[placeholder="+242 06 123 4567"]');
    await expect(phoneInput).toHaveValue("+242 06 000 001");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue("contact@ecole.cg");
    const addrInput = page.locator('input[placeholder="Brazzaville, Congo"]');
    await expect(addrInput).toHaveValue("Pointe-Noire, Congo");

    console.log("OK Bug 1: School settings PATCH works and persists after reload");
  });
});
