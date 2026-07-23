import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 13 — Messagerie", () => {
  test.setTimeout(300000);

  // ====================================================================
  // TEST 1: Admin crée conversation avec teacher, échange messages
  // ====================================================================
  test("admin creates conversation with teacher and they exchange messages", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "msg1-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;

    // Register admin
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Msg School", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    // Create teacher
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });
    expect(td).not.toBeNull();
    expect(td.id).toBeDefined();
    console.log("✅ Teacher created:", td.id);

    // Admin creates conversation
    const conv = await page.evaluate(async (teacherUserId) => {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: [teacherUserId] }),
      });
      return r.ok ? await r.json() : null;
    }, td.user_id);
    expect(conv).not.toBeNull();
    expect(conv.id).toBeDefined();
    console.log("✅ Conversation created:", conv.id);

    // Admin sends first message
    const msg1 = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Bonjour Jean, avez-vous les notes ?" }),
      });
      return r.ok ? await r.json() : null;
    }, conv.id);
    expect(msg1).not.toBeNull();
    expect(msg1.content).toBe("Bonjour Jean, avez-vous les notes ?");
    console.log("✅ Admin sent message");

    // Admin sends second message
    const msg2 = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Merci d'avance" }),
      });
      return r.ok ? await r.json() : null;
    }, conv.id);
    expect(msg2).not.toBeNull();
    console.log("✅ Admin sent second message");

    // Admin fetches messages — should see 2
    const adminMsgs = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return r.ok ? await r.json() : [];
    }, conv.id);
    expect(adminMsgs).toHaveLength(2);
    expect(adminMsgs[0].content).toBe("Bonjour Jean, avez-vous les notes ?");
    expect(adminMsgs[1].content).toBe("Merci d'avance");
    console.log("✅ Admin sees 2 messages");

    // Admin fetches conversation list — should see 1 conversation
    const adminConvs = await page.evaluate(async () => {
      const r = await fetch("/api/conversations");
      return r.ok ? await r.json() : [];
    });
    expect(adminConvs.length).toBeGreaterThanOrEqual(1);
    const foundConv = adminConvs.find((c: any) => c.id === conv.id);
    expect(foundConv).toBeDefined();
    console.log("✅ Admin sees conversation in list");

    // Logout admin, login as teacher
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', td.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    console.log("✅ Logged in as teacher");

    // Teacher fetches conversations — should see 1
    const teacherConvs = await page.evaluate(async () => {
      const r = await fetch("/api/conversations");
      return r.ok ? await r.json() : [];
    });
    const teacherFound = teacherConvs.find((c: any) => c.id === conv.id);
    expect(teacherFound).toBeDefined();
    console.log("✅ Teacher sees conversation in list");

    // Teacher fetches messages — should see 2 from admin
    const teacherMsgs = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return r.ok ? await r.json() : [];
    }, conv.id);
    expect(teacherMsgs).toHaveLength(2);
    console.log("✅ Teacher sees admin's messages");

    // Teacher replies
    const teacherMsg = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Oui, je les ai. Je vous les envoie." }),
      });
      return r.ok ? await r.json() : null;
    }, conv.id);
    expect(teacherMsg).not.toBeNull();
    expect(teacherMsg.content).toBe("Oui, je les ai. Je vous les envoie.");
    console.log("✅ Teacher replied");

    // Both should now see 3 messages
    const finalAdminMsgs = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return r.ok ? await r.json() : [];
    }, conv.id);
    expect(finalAdminMsgs).toHaveLength(3);
    expect(finalAdminMsgs[2].content).toBe("Oui, je les ai. Je vous les envoie.");
    console.log("✅ Conversation has 3 messages total");
  });

  // ====================================================================
  // TEST 2: Parent (non-participant) cannot see/access conversation
  // ====================================================================
  test("parent who is NOT a participant cannot see the conversation", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "msg2-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;
    const PARENT_EMAIL = `parent-${rand}@test.com`;

    // Register admin
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok;
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Msg School 2", subdomain: SCHOOL },
    });

    // Create teacher + parent
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });

    const pd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Marie", last_name: "Parent", email: PARENT_EMAIL, phone: "+242060000001", relationship: "Mère", profession: "Infirmière" },
    });
    expect(pd).not.toBeNull();

    // Admin creates conversation with teacher ONLY
    const conv = await page.evaluate(async (teacherUserId) => {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: [teacherUserId] }),
      });
      return r.ok ? await r.json() : null;
    }, td.user_id);
    expect(conv).not.toBeNull();

    // Send a message
    await page.evaluate(async (convId) => {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Message secret admin-teacher" }),
      });
    }, conv.id);

    // Logout, login as parent
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[type="password"]', pd.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);
    console.log("✅ Logged in as parent");

    // Parent's conversation list should NOT contain the admin-teacher conversation
    const parentConvs = await page.evaluate(async () => {
      const r = await fetch("/api/conversations");
      return r.ok ? await r.json() : [];
    });
    const parentFound = parentConvs.find((c: any) => c.id === conv.id);
    expect(parentFound).toBeUndefined();
    console.log("✅ Parent cannot see admin-teacher conversation");

    // Parent should NOT be able to read messages (403)
    const parentMsgsRes = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return { status: r.status, data: r.ok ? await r.json() : [] };
    }, conv.id);
    expect(parentMsgsRes.status).toBe(403);
    console.log("✅ Parent blocked from reading messages (403)");

    // Parent should NOT be able to send messages (403)
    const parentSendRes = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Intrusion!" }),
      });
      return { status: r.status };
    }, conv.id);
    expect(parentSendRes.status).toBe(403);
    console.log("✅ Parent blocked from sending messages (403)");
  });

  // ====================================================================
  // TEST 3: All 4 role message pages load without error
  // ====================================================================
  test("all role message pages load successfully", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "msg3-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;
    const PARENT_EMAIL = `parent-${rand}@test.com`;
    const STUDENT_EMAIL = `student-${rand}@t.com`;

    // Register admin
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Msg School 3", subdomain: SCHOOL },
    });

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Create teacher, parent, student
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });

    const pd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/parents`,
      data: { first_name: "Marie", last_name: "Parent", email: PARENT_EMAIL, phone: "+242060000002", relationship: "Mère", profession: "Infirmière" },
    });

    // Create class + student for student login
    const yd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/academic-years`, data: { name: "2025-2026", start_date: "2025-09-15", end_date: "2026-07-15", is_current: true } });

    const cd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, { url: `${BASE}/api/classes`, data: { name: "6eme A", level: "6eme", academic_year_id: yd.id, capacity: 30 } });

    const sd = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/students`,
      data: { matricule: `MAT-${rand}`, first_name: "Paul", last_name: "Etudiant", email: STUDENT_EMAIL, class_id: cd.id, gender: "M" },
    });

    // === Admin messages page ===
    await page.goto(`${BASE}/${SCHOOL}/admin/messages`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Messagerie").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Admin messages page loads");

    // === Logout and login as teacher ===
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', td.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/teacher`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");

    await page.goto(`${BASE}/${SCHOOL}/teacher/messages`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Messagerie").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Teacher messages page loads");

    // === Logout and login as parent ===
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', PARENT_EMAIL);
    await page.fill('input[type="password"]', pd.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/parent`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");

    await page.goto(`${BASE}/${SCHOOL}/parent/messages`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Messagerie").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Parent messages page loads");

    // === Logout and login as student ===
    await page.evaluate(() => {
      document.cookie = "sb-wvxahcvyejsxmlrirhdr-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00; samesite=lax";
    });
    await page.goto(`${BASE}/${SCHOOL}/login`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', STUDENT_EMAIL);
    await page.fill('input[type="password"]', sd.tempPassword);
    await Promise.all([
      page.waitForURL(`**/${SCHOOL}/student`, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("load");

    await page.goto(`${BASE}/${SCHOOL}/student/messages`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Messagerie").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Student messages page loads");
  });

  // ====================================================================
  // TEST 4: Conversation list shows participant names, message UI works
  // ====================================================================
  test("conversation UI displays names and messages correctly", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "msg4-" + rand;
    const ADMIN_EMAIL = `admin-${rand}@test.com`;
    const TEACHER_EMAIL = `teacher-${rand}@test.com`;

    // Register admin
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Test", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Msg School 4", subdomain: SCHOOL },
    });

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Create teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });

    // Create conversation + messages via API
    const conv = await page.evaluate(async (teacherUserId) => {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: [teacherUserId] }),
      });
      return r.ok ? await r.json() : null;
    }, td.user_id);

    await page.evaluate(async (convId) => {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Test message from admin" }),
      });
    }, conv.id);

    // Navigate to messages UI page
    await page.goto(`${BASE}/${SCHOOL}/admin/messages`, { waitUntil: "load" });
    await page.waitForTimeout(3000);

    // Should see "Messages" heading
    await expect(page.locator("h2:text('Messages')").first()).toBeVisible({ timeout: 5000 });

    // Should see teacher name in conversation list
    const convList = page.locator("text=Jean Prof");
    await expect(convList.first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Conversation list shows participant name");

    // Click on the conversation
    const convButton = page.locator("button").filter({ hasText: "Jean Prof" }).first();
    await convButton.click();
    await page.waitForTimeout(2000);

    // Should see the message content
    await expect(page.locator("text=Test message from admin").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Message content visible in UI");

    // Type and send a new message
    const msgInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await msgInput.fill("Hello from UI test");
    const sendBtn = page.locator("button[type='submit']").last();
    await sendBtn.click();
    await page.waitForTimeout(2000);

    // Should see the new message
    await expect(page.locator("text=Hello from UI test").first()).toBeVisible({ timeout: 5000 });
    console.log("✅ New message sent and visible in UI");
  });
});
