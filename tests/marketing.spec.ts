import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Marketing Demo Videos", () => {

  test("enregistrer une vidéo marketing complète", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "demo-" + rand;
    const ADMIN_EMAIL = `directeur@${SCHOOL}.com`;
    const TEACHER_EMAIL = `professeur@${SCHOOL}.com`;
    const PARENT_EMAIL = `parent@${SCHOOL}.com`;
    const STUDENT_EMAIL = `eleve@${SCHOOL}.com`;

    // 1. Inscription du Directeur (Vue Publique)
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 15000 });
    
    // Step 1: Account
    await page.fill('input[name="firstName"]', "Mamadou");
    await page.fill('input[name="lastName"]', "Directeur");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', "Demo1234!");
    
    // Click "Continuer" (it's a button of type button, since type="submit" is on step 2)
    // Actually, looking at the code, it probably says "Continuer"
    await page.click('button:has-text("Continuer")');
    await page.waitForTimeout(500); // Wait for transition
    
    // Step 2: School
    await page.fill('input[name="schoolName"]', "Complexe Scolaire Excellence");
    await page.fill('input[name="subdomain"]', SCHOOL);
    
    await page.click('button[type="submit"]');
    
    // Attendre l'arrivée sur le dashboard Admin
    await page.waitForURL(`${BASE}/${SCHOOL}/admin`);
    await page.waitForTimeout(3000); // Pause pour montrer le dashboard vide
    
    // 2. Seeding des données de test via API pour aller plus vite
    const authHeaders = { "Content-Type": "application/json" };
    
    // Créer année scolaire
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return await r.json();
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });
    
    // Créer une classe
    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return await r.json();
    }, { url: `${BASE}/api/classes`, data: { name: "Terminale D", level: "Terminale", academic_year_id: yd.id, capacity: 30 } });
    
    // Créer Parent, Prof et Élève via API Admin
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, { url: `${BASE}/api/users/parents`, data: { firstName: "Amina", lastName: "Parent", email: PARENT_EMAIL, phone: "060000000" } });
    
    const parentRes = await supabaseAdmin.from("users").select("id").eq("email", PARENT_EMAIL).single();
    
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, { url: `${BASE}/api/users/students`, data: { firstName: "Kader", lastName: "Eleve", email: STUDENT_EMAIL, classId: cd.id, parentIds: [parentRes.data!.id], matricule: `MAT-${rand}` } });
    
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, { url: `${BASE}/api/users/teachers`, data: { firstName: "Jean", lastName: "Professeur", email: TEACHER_EMAIL, phone: "050000000", specialties: ["Mathématiques"] } });
    
    // Reset passwords to something easy for the script
    await supabaseAdmin.auth.admin.updateUserById((await supabaseAdmin.from("users").select("id").eq("email", TEACHER_EMAIL).single()).data!.id, { password: "password123" });
    await supabaseAdmin.auth.admin.updateUserById((await supabaseAdmin.from("users").select("id").eq("email", STUDENT_EMAIL).single()).data!.id, { password: "password123" });
    await supabaseAdmin.auth.admin.updateUserById((await supabaseAdmin.from("users").select("id").eq("email", PARENT_EMAIL).single()).data!.id, { password: "password123" });

    // Refresh Admin Dashboard pour voir les stats à jour
    await page.reload();
    await page.waitForTimeout(3000); // Pause pour montrer les stats

    // Visiter quelques pages admin
    await page.click('a[href="/admin/students"]');
    await page.waitForTimeout(2000);

    // Déconnexion Admin
    await page.click('button[title="Déconnexion"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/login`);
    await page.waitForTimeout(1000);
    
    // 3. Connexion Professeur
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/teacher`);
    await page.waitForTimeout(4000); // Montrer dashboard prof
    
    await page.click('button[title="Déconnexion"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/login`);
    
    // 4. Connexion Élève
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/student`);
    await page.waitForTimeout(4000); // Montrer dashboard élève
    
    await page.click('button[title="Déconnexion"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/login`);
    
    // 5. Connexion Parent
    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/parent`);
    await page.waitForTimeout(4000); // Montrer dashboard parent
    
    await page.click('button[title="Déconnexion"]');
    await page.waitForURL(`${BASE}/${SCHOOL}/login`);
  });
});
