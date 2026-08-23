import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SUFFIX = `${Date.now().toString(36)}`;
const SCHOOL = `acct-rls-${SUFFIX}`;
const ACCT_EMAIL = `cpt-rls-${SUFFIX}@test.com`;
const ACCT_PW = "CptProbe123!";
const STUDENT_EMAIL = `stu-rls-${SUFFIX}@test.com`;

test.describe("Probe: compte-comptable RBAC réel (API directe)", () => {
  let schoolId: string;
  let studentId: string;
  let acctUserId: string;

  test.beforeAll(async () => {
    const { data: school } = await supabaseAdmin
      .from("schools")
      .insert({ name: "RLS Probe", subdomain: SCHOOL, code: SCHOOL.toUpperCase(), is_active: true })
      .select("id")
      .single();
    schoolId = school!.id;

    const { data: yds } = await supabaseAdmin
      .from("academic_years")
      .insert({ school_id: schoolId, name: "Probi", start_date: "2026-09-01", end_date: "2027-08-31", is_current: true })
      .select("id")
      .single();
    const { data: cls } = await supabaseAdmin
      .from("classes")
      .insert({ school_id: schoolId, name: "5e", level: "5e", capacity: 30, academic_year_id: yds.id })
      .select("id")
      .single();

    const { data: stuAuth, error: stuErr } = await supabaseAdmin.auth.admin.createUser({
      email: STUDENT_EMAIL,
      password: "StuProbe1!",
      email_confirm: true,
      user_metadata: { first_name: "Stu", last_name: "Probe", role: "student" },
    });
    if (stuErr || !stuAuth.user) throw new Error("createUser student failed: " + JSON.stringify(stuErr));
    await supabaseAdmin.from("users").insert({
      id: stuAuth.user.id, email: STUDENT_EMAIL, role: "student", school_id: schoolId, first_name: "Stu", last_name: "Probe",
    });
    const { data: stu } = await supabaseAdmin
      .from("students")
      .insert({ user_id: stuAuth.user.id, school_id: schoolId, class_id: cls.id, matricule: `STUPROBE-${SUFFIX}`, gender: "M" })
      .select("id")
      .single();
    studentId = stu.id;

    await supabaseAdmin.from("payments").insert({
      student_id: stu.id, school_id: schoolId, amount: 100, payment_date: "2026-08-21", payment_method: "cash", status: "confirmed",
    });

    const { data: acctAuth, error: acctErr } = await supabaseAdmin.auth.admin.createUser({
      email: ACCT_EMAIL, password: ACCT_PW, email_confirm: true,
      user_metadata: { first_name: "Cpt", last_name: "Probe", role: "accountant", school_id: schoolId },
    });
    if (acctErr || !acctAuth.user) throw new Error("createUser accountant failed: " + JSON.stringify(acctErr));
    acctUserId = acctAuth.user.id;
    await supabaseAdmin.from("users").insert({
      id: acctUserId, email: ACCT_EMAIL, role: "accountant", school_id: schoolId, first_name: "Cpt", last_name: "Probe",
    });

    (globalThis as any).__PROBE_SCHOOL = { slug: SCHOOL, schoolId, studentId: stu.id, email: ACCT_EMAIL };
  });

  test.afterAll(async () => {
    if (schoolId) await supabaseAdmin.from("schools").delete().eq("id", schoolId);
    if (acctUserId) await supabaseAdmin.auth.admin.deleteUser(acctUserId);
  });

  test("comptable: students lecture vide, students/payments POST 403, paiement lecture OK", async ({ page }) => {
    const { slug, studentId } = (globalThis as any).__PROBE_SCHOOL as { slug: string; studentId: string };

    // Login via l'API (Set-Cookie stocké par le browser) → contourne le formulaire flaky
    await page.goto(`${BASE}/${slug}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const loginRes = await page.evaluate(async (creds) => {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.pw }),
      });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
    }, { email: ACCT_EMAIL, pw: ACCT_PW } as const);
    expect(loginRes.ok).toBe(true);
    // getAuthUser lit le cookie → /accountant dashboard
    await page.goto(`${BASE}/${slug}/accountant`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(new RegExp(`${slug}/accountant`), { timeout: 30000 });
    await page.waitForTimeout(1000);

    const getStudents = await page.evaluate(async () => {
      const r = await fetch("/api/students", { method: "GET" });
      const body = await r.json().catch(() => null);
      return { status: r.status, count: Array.isArray(body?.data) ? body.data.length : "n/a" };
    });
    console.log("GET  /api/students -> status", getStudents.status, "rows", getStudents.count);
    expect(getStudents.status).toBe(200);
    expect(getStudents.count).toBe(0);

    const postStudents = await page.evaluate(async () => {
      const r = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricule: "HACK", first_name: "Hack", last_name: "Me", email: "hack@r.com", class_id: "00000000-0000-0000-0000-000000000000", gender: "M" }),
      });
      const body = await r.json().catch(() => null);
      return { status: r.status, body };
    });
    console.log("POST /api/students  -> status", postStudents.status, JSON.stringify(postStudents.body));
    expect(postStudents.status).toBe(403);

    const getPayments = await page.evaluate(async () => {
      const r = await fetch("/api/payments", { method: "GET" });
      const body = await r.json().catch(() => null);
      const count = Array.isArray(body) ? body.length : (Array.isArray(body?.data) ? body.data.length : "n/a");
      return { status: r.status, count, body };
    });
    console.log("GET  /api/payments -> status", getPayments.status, "rows", getPayments.count, "body", JSON.stringify(getPayments.body).slice(0, 400));
    expect(getPayments.status).toBe(200);
    expect(getPayments.count).toBeGreaterThanOrEqual(1);

    const postPayments = await page.evaluate(async (sid: string) => {
      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: sid, academic_year_id: "00000000-0000-0000-0000-000000000000", amount: 50, payment_date: "2026-08-21", payment_method: "cash" }),
      });
      const body = await r.json().catch(() => null);
      return { status: r.status, body };
    }, studentId);
    console.log("POST /api/payments -> status", postPayments.status, JSON.stringify(postPayments.body));
    expect(postPayments.status).toBe(403);

    console.log("OK Probe RBAC: comptable bloqué en ecriture students/payments, lecture paiements autorée");
  });
});
