import { chromium, type Browser } from "playwright";
import { mkdirSync, copyFileSync, existsSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3000";
const SLUG = "lycee-sassou";
const OUT = "C:\\Users\\barry\\AppData\\Local\\Temp\\opencode\\geschool-demo";
const VIEWPORT = { width: 1440, height: 810 };
const ONLY = process.argv.slice(2);

type Scene = { u: string; d: number };
type Role = {
  label: string;
  email: string;
  pw: string;
  path: string;
  shots: Scene[];
};

const ROLES: Role[] = [
  {
    label: "admin",
    email: "admin@lycee-sassou.test",
    pw: "password123",
    path: "/admin",
    shots: [
      { u: "/admin", d: 18 },
      { u: "/admin/students", d: 14 },
      { u: "/admin/teachers", d: 12 },
      { u: "/admin/classes", d: 12 },
      { u: "/admin/payments", d: 14 },
      { u: "/admin/attendance", d: 12 },
      { u: "/admin/schedule", d: 12 },
      { u: "/admin/reports", d: 10 },
    ],
  },
  {
    label: "teacher",
    email: "jean.mbokani@lycee-sassou.cd",
    pw: "password123",
    path: "/teacher",
    shots: [
      { u: "/teacher", d: 14 },
      { u: "/teacher/grades", d: 14 },
      { u: "/teacher/attendance", d: 12 },
      { u: "/teacher/schedule", d: 10 },
      { u: "/teacher/messages", d: 12 },
    ],
  },
  {
    label: "student",
    email: "alain.mabiala@etudiant.cd",
    pw: "password123",
    path: "/student",
    shots: [
      { u: "/student", d: 14 },
      { u: "/student/grades", d: 14 },
      { u: "/student/schedule", d: 10 },
      { u: "/student/messages", d: 10 },
    ],
  },
  {
    label: "parent",
    email: "antoine.mabiala@parent.cd",
    pw: "password123",
    path: "/parent",
    shots: [
      { u: "/parent", d: 14 },
      { u: "/parent/children", d: 12 },
      { u: "/parent/payments", d: 12 },
      { u: "/parent/schedule", d: 10 },
      { u: "/parent/messages", d: 12 },
    ],
  },
];

async function login(page: any, role: Role) {
  await page.goto(`${BASE}/${SLUG}/login`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector('button[type="submit"]:has-text("Se connecter")', { timeout: 180000 });
  await page.waitForTimeout(6000);
  await page.fill('input[name="email"]', role.email);
  await page.fill('input[name="password"]', role.pw);
  await page.waitForTimeout(500);
  await page.click('button[type="submit"]');
  const ok = await page
    .waitForURL((u: any) => u.pathname.startsWith(`/${SLUG}${role.path}`), { timeout: 180000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) throw new Error(`login failed for ${role.label}: ${page.url()}`);
}

async function dwell(page: any, secs: number) {
  const steps = Math.max(1, Math.round(secs / 5));
  for (let i = 0; i < steps; i++) {
    await (page as any).waitForTimeout(4000);
    try {
      await page.mouse.wheel(0, 380);
    } catch {}
    if (i === Math.floor(steps / 2)) {
      try {
        await page.mouse.wheel(120, 0);
        await page.waitForTimeout(600);
        await page.mouse.wheel(-120, 0);
      } catch {}
      await page.waitForTimeout(500);
    }
  }
  try {
    await page.mouse.wheel(0, -2000);
  } catch {}
  await page.waitForTimeout(800);
}

async function warmUp(browser: Browser, roles: Role[]) {
  for (const role of roles) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    try {
      await login(page, role);
      for (const s of role.shots) {
        try {
          await page.goto(`${BASE}/${SLUG}${s.u}`, { waitUntil: "domcontentloaded", timeout: 120000 });
          await page.waitForTimeout(800);
        } catch (e: any) {
          console.log(`warmup skip ${role.label}${s.u}: ${e.message.slice(0, 80)}`);
        }
      }
      console.log(`warmup ${role.label} done`);
    } catch (e: any) {
      console.log(`warmup ${role.label} FAILED: ${e.message.slice(0, 120)}`);
    }
    await ctx.close();
  }
}

async function recordRole(browser: Browser, role: Role) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUT, size: VIEWPORT },
  });
  const page = await ctx.newPage();
  await login(page, role);
  // hold sur le dashboard (déjà capté par la 1ère shot)
  for (const s of role.shots) {
    await page.goto(`${BASE}/${SLUG}${s.u}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(1500);
    await dwell(page, s.d);
  }
  const video = page.video();
  const vpath = video ? await video.path() : null;
  await ctx.close();
  if (vpath && existsSync(vpath)) {
    copyFileSync(vpath, join(OUT, `${role.label}.webm`));
    console.log(`clip ${role.label}.webm -> ${vpath}`);
  } else {
    console.log(`clip ${role.label}: no video file`);
  }
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const roles = ROLES.filter((r) => ONLY.length === 0 || ONLY.includes(r.label));
  if (roles.length === 0) {
    console.log("aucun rôle sélectionné:", ONLY);
    await browser.close();
    return;
  }
  await warmUp(browser, roles);
  for (const role of roles) {
    await recordRole(browser, role);
  }
  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});