import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Use a slower playback so the video looks good for marketing
test.describe("Marketing Demo Video - Geschool", () => {

  test("full simulation flow for marketing", async ({ page }) => {
    // 1. CREATE DEMO ACCOUNTS VIA API
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "demo-" + rand;
    const ADMIN_EMAIL = `admin@${SCHOOL}.com`;
    const TEACHER_EMAIL = `teacher@${SCHOOL}.com`;
    const PARENT_EMAIL = `parent@${SCHOOL}.com`;
    const STUDENT_EMAIL = `student@${SCHOOL}.com`;

    // ===== REGISTER SCHOOL =====
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 15000 });
    
    // Step 1: Account
    await page.fill('input[name="firstName"]', "Directeur");
    await page.fill('input[name="lastName"]', "Principal");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', "password123");
    
    await page.click('button:has-text("Continuer")');
    await expect(page.locator('input[name="schoolName"]')).toBeVisible({ timeout: 15000 });
    
    // Step 2: School
    await page.fill('input[name="schoolName"]', "Lycée Excellence (Demo)");
    await page.fill('input[name="subdomain"]', SCHOOL);
    
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/admin`);
    
    // We are now logged in as ADMIN
    // Add a quick pause to show the dashboard
    await page.waitForTimeout(2000);

    // Naviguer dans les menus admin
    await page.locator(`a[href="/${SCHOOL}/admin/classes"]`).filter({ visible: true }).first().click();
    await page.waitForTimeout(2000);

    await page.locator(`a[href="/${SCHOOL}/admin/teachers"]`).filter({ visible: true }).first().click();
    await page.waitForTimeout(2000);
    
    await page.locator(`a[href="/${SCHOOL}/admin/students"]`).filter({ visible: true }).first().click();
    await page.waitForTimeout(2000);
    
    // Logout
    await page.click('button[title="Déconnexion"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/login`);

    // Note: To fully simulate Teacher/Parent/Student, we need to create them. 
    // For a real marketing video, we would programmatically insert data into Supabase here
    // or run through the actual forms to show how easy it is to add a teacher, etc.
  });
});
