import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";

const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe("Chantier 13 — Pièces jointes", () => {
  test.setTimeout(300000);

  test("admin sends image + PDF, teacher can view/download", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "att-" + rand;
    const ADMIN_EMAIL = `adm-att-${rand}@test.com`;
    const TEACHER_EMAIL = `tch-att-${rand}@test.com`;

    // Register school
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    const reg = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { ok: r.ok };
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Att", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Att School", subdomain: SCHOOL },
    });
    expect(reg.ok).toBeTruthy();

    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    // Create teacher
    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Jean", last_name: "Prof", email: TEACHER_EMAIL, specialization: "Maths" },
    });
    expect(td).not.toBeNull();

    // Create conversation
    const conv = await page.evaluate(async (teacherUserId) => {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: [teacherUserId] }),
      });
      return r.ok ? await r.json() : null;
    }, td.user_id);
    expect(conv).not.toBeNull();

    // Create message
    const msg = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Voici les documents" }),
      });
      return r.ok ? await r.json() : null;
    }, conv.id);
    expect(msg).not.toBeNull();

    // Generate test files
    const tmpDir = mkdtempSync(resolve(process.cwd(), ".tmp-att-"));
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00,
      0x00, 0x00, 0x04, 0x00, 0x01, 0x27, 0x34, 0x27,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82,
    ]);
    writeFileSync(resolve(tmpDir, "test.png"), pngBytes);

    const pdfContent = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\n" +
      "0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n" +
      "trailer<</Size 3/Root 1 0 R>>\nstartxref\n109\n%%EOF"
    );
    writeFileSync(resolve(tmpDir, "test.pdf"), pdfContent);

    // Upload images to storage + DB (simulating what POST /api/attachments does)
    const storageImg = `${conv.id}/${msg.id}/img-${rand}.png`;
    const { error: upImg } = await supabaseAdmin.storage
      .from("message-attachments")
      .upload(storageImg, pngBytes, { contentType: "image/png" });
    expect(upImg).toBeNull();
    const { data: attImg } = await supabaseAdmin
      .from("message_attachments")
      .insert({ message_id: msg.id, file_name: "test.png", file_type: "image/png", file_size: pngBytes.length, storage_path: storageImg })
      .select().single();
    expect(attImg).not.toBeNull();
    console.log("✅ Image attachment created");

    const storagePdf = `${conv.id}/${msg.id}/doc-${rand}.pdf`;
    const { error: upPdf } = await supabaseAdmin.storage
      .from("message-attachments")
      .upload(storagePdf, pdfContent, { contentType: "application/pdf" });
    expect(upPdf).toBeNull();
    const { data: attPdf } = await supabaseAdmin
      .from("message_attachments")
      .insert({ message_id: msg.id, file_name: "test.pdf", file_type: "application/pdf", file_size: pdfContent.length, storage_path: storagePdf })
      .select().single();
    expect(attPdf).not.toBeNull();
    console.log("✅ PDF attachment created");

    // As admin, fetch messages — should include attachments with signed URLs
    const msgs = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return r.ok ? await r.json() : [];
    }, conv.id);
    const lastMsg = msgs[msgs.length - 1];
    expect(lastMsg.attachments).toBeDefined();
    expect(lastMsg.attachments).toHaveLength(2);
    console.log("✅ Admin sees 2 attachments");

    const imgAtt = lastMsg.attachments.find((a: any) => a.file_type === "image/png");
    expect(imgAtt.signed_url).toContain("token=");
    const pdfAtt = lastMsg.attachments.find((a: any) => a.file_type === "application/pdf");
    expect(pdfAtt.signed_url).toContain("token=");
    console.log("✅ Both attachments have signed URLs");

    // Login as teacher
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
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Teacher fetches messages — should see same attachments
    const tMsgs = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return r.ok ? await r.json() : [];
    }, conv.id);
    const tLast = tMsgs[tMsgs.length - 1];
    expect(tLast.attachments).toHaveLength(2);
    console.log("✅ Teacher sees 2 attachments");

    // Teacher downloads PNG — size matches, content is valid PNG
    const tImg = tLast.attachments.find((a: any) => a.file_type === "image/png");
    const imgDl = await page.evaluate(async (url) => {
      const r = await fetch(url);
      const b = await r.blob();
      return { ok: r.ok, size: b.size, type: b.type };
    }, tImg.signed_url);
    expect(imgDl.ok).toBeTruthy();
    expect(imgDl.size).toBe(pngBytes.length);
    console.log("✅ Teacher downloaded PNG, size correct:", imgDl.size);

    // Teacher downloads PDF — size matches, content starts with %PDF-
    const tPdf = tLast.attachments.find((a: any) => a.file_type === "application/pdf");
    const pdfDl = await page.evaluate(async (url) => {
      const r = await fetch(url);
      const buf = await r.arrayBuffer();
      const decoder = new TextDecoder("utf-8");
      const head = decoder.decode(buf.slice(0, 5));
      return { ok: r.ok, size: buf.byteLength, head };
    }, tPdf.signed_url);
    expect(pdfDl.ok).toBeTruthy();
    expect(pdfDl.size).toBe(pdfContent.length);
    expect(pdfDl.head).toBe("%PDF-");
    console.log("✅ Teacher downloaded PDF, content verified");

    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("oversized file and .exe are rejected, valid file accepted", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "rej-" + rand;
    const ADMIN_EMAIL = `adm-rej-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Rej", email: ADMIN_EMAIL, password: "Test123!", schoolName: "Rej School", subdomain: SCHOOL },
    });
    await page.goto(`${BASE}/${SCHOOL}/admin`, { waitUntil: "networkidle" });

    const td = await page.evaluate(async ({ url, data }) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return r.ok ? await r.json() : null;
    }, {
      url: `${BASE}/api/teachers`,
      data: { first_name: "Test", last_name: "Prof", email: `rej-tch-${rand}@test.com`, specialization: "Maths" },
    });
    expect(td).not.toBeNull();

    const conv = await page.evaluate(async (teacherUserId) => {
      const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participant_ids: [teacherUserId] }) });
      return r.ok ? await r.json() : null;
    }, td.user_id);
    expect(conv).not.toBeNull();

    const msg = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Test" }) });
      return r.ok ? await r.json() : null;
    }, conv.id);
    expect(msg).not.toBeNull();

    // 1. .exe rejected
    const exeRes = await page.evaluate(async ({ convId, msgId }) => {
      const fd = new FormData();
      fd.append("file", new Blob(["bad"], { type: "application/x-msdownload" }), "virus.exe");
      fd.append("messageId", msgId);
      fd.append("conversationId", convId);
      const r = await fetch("/api/attachments", { method: "POST", body: fd });
      return { status: r.status, error: r.ok ? null : (await r.json()).error };
    }, { convId: conv.id, msgId: msg.id });
    expect(exeRes.status).toBe(400);
    expect(exeRes.error).toContain("Type de fichier non autorisé");
    console.log("✅ .exe rejected:", exeRes.error);

    // 2. Oversized (>10MB) rejected
    const bigRes = await page.evaluate(async ({ convId, msgId }) => {
      const fd = new FormData();
      fd.append("file", new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: "image/png" }), "huge.png");
      fd.append("messageId", msgId);
      fd.append("conversationId", convId);
      const r = await fetch("/api/attachments", { method: "POST", body: fd });
      return { status: r.status, error: r.ok ? null : (await r.json()).error };
    }, { convId: conv.id, msgId: msg.id });
    expect(bigRes.status).toBe(400);
    expect(bigRes.error).toContain("trop volumineux");
    console.log("✅ Oversized file rejected:", bigRes.error);

    // 3. Valid PNG accepted
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgYGAAAAAEAAEnNCcAAAAASUVORK5CYII=";
    const okRes = await page.evaluate(async ({ convId, msgId, b64 }) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const fd = new FormData();
      fd.append("file", new Blob([bytes], { type: "image/png" }), "valid.png");
      fd.append("messageId", msgId);
      fd.append("conversationId", convId);
      const r = await fetch("/api/attachments", { method: "POST", body: fd });
      return { ok: r.ok, status: r.status, data: r.ok ? await r.json() : null };
    }, { convId: conv.id, msgId: msg.id, b64: pngBase64 });
    expect(okRes.ok).toBeTruthy();
    expect(okRes.data.file_name).toBe("valid.png");
    console.log("✅ Valid PNG accepted, ID:", okRes.data.id);
  });

  test("non-participant cannot access attachments", async ({ page }) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const SCHOOL = "npa-" + rand;
    const ADMIN_EMAIL = `adm-npa-${rand}@test.com`;
    const TEACHER_EMAIL = `tch-npa-${rand}@test.com`;
    const PARENT_EMAIL = `par-npa-${rand}@test.com`;

    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.evaluate(async ({ url, data }) => {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, {
      url: `${BASE}/api/auth/register`,
      data: { firstName: "Admin", lastName: "Npa", email: ADMIN_EMAIL, password: "Test123!", schoolName: "NPA School", subdomain: SCHOOL },
    });
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
      data: { first_name: "Marie", last_name: "Parent", email: PARENT_EMAIL, phone: "+24206000001", relationship: "Mère", profession: "Infirmière" },
    });
    expect(pd).not.toBeNull();

    // Create conversation — admin + teacher only (no parent)
    const conv = await page.evaluate(async (teacherUserId) => {
      const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participant_ids: [teacherUserId] }) });
      return r.ok ? await r.json() : null;
    }, td.user_id);
    expect(conv).not.toBeNull();

    const msg = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Secret" }) });
      return r.ok ? await r.json() : null;
    }, conv.id);
    expect(msg).not.toBeNull();

    // Insert attachment via admin
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00,
      0x00, 0x00, 0x04, 0x00, 0x01, 0x27, 0x34, 0x27,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
      0xAE, 0x42, 0x60, 0x82,
    ]);
    const storagePath = `${conv.id}/${msg.id}/secret-${rand}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("message-attachments")
      .upload(storagePath, pngBytes, { contentType: "image/png" });
    expect(upErr).toBeNull();
    const { data: att } = await supabaseAdmin
      .from("message_attachments")
      .insert({ message_id: msg.id, file_name: "secret.png", file_type: "image/png", file_size: pngBytes.length, storage_path: storagePath })
      .select().single();
    expect(att).not.toBeNull();
    console.log("✅ Secret attachment created");

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

    // Parent cannot see conversation in list
    const convs = await page.evaluate(async () => {
      const r = await fetch("/api/conversations");
      return r.ok ? await r.json() : [];
    });
    expect(convs.find((c: any) => c.id === conv.id)).toBeUndefined();
    console.log("✅ Parent cannot see conversation");

    // Parent cannot GET attachments (403)
    const getRes = await page.evaluate(async (msgId) => {
      const r = await fetch(`/api/attachments?messageId=${msgId}`);
      return { status: r.status };
    }, msg.id);
    expect(getRes.status).toBe(403);
    console.log("✅ Parent blocked from GET /api/attachments (403)");

    // Parent cannot POST to this conversation's attachments (403)
    const postRes = await page.evaluate(async ({ msgId, convId }) => {
      const fd = new FormData();
      fd.append("file", new Blob(["test"], { type: "image/png" }), "hack.png");
      fd.append("messageId", msgId);
      fd.append("conversationId", convId);
      const r = await fetch("/api/attachments", { method: "POST", body: fd });
      return { status: r.status };
    }, { msgId: msg.id, convId: conv.id });
    expect(postRes.status).toBe(403);
    console.log("✅ Parent blocked from POST (403)");

    // Parent cannot fetch messages (403)
    const msgRes = await page.evaluate(async (convId) => {
      const r = await fetch(`/api/conversations/${convId}/messages`);
      return { status: r.status };
    }, conv.id);
    expect(msgRes.status).toBe(403);
    console.log("✅ Parent blocked from /messages (403)");
  });
});
