/**
 * GESchool Demo Script — QA + Marketing Automation
 *
 * Usage: node scripts/demo-geschool.cjs
 *
 * Connects to production at https://geschool.vercel.app
 * Creates demo school "Collège Excellence", seeds data, captures screenshots.
 */

const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const CAPTURES = path.resolve(__dirname, "..", "captures");
const ERRORS = path.resolve(CAPTURES, "erreurs");
const BASE = "https://geschool.vercel.app";

const PWD = "Demo2024!";

const SCHOOL = {
  firstName: "Bienvenu",
  lastName: "Nkounkou",
  email: "bienvenu.nkounkou@college-excellence.cg",
  password: PWD,
  schoolName: "Collège Excellence",
  subdomain: "college-excellence",
};

const TEACHERS = [
  { fn: "Rachel", ln: "Mboungou", email: "rachel.mboungou@college-excellence.cg", subj: "Français" },
  { fn: "Serge", ln: "Moukassa", email: "serge.moukassa@college-excellence.cg", subj: "Mathématiques" },
  { fn: "Grâce", ln: "Loubaki", email: "grace.loubaki@college-excellence.cg", subj: "Anglais" },
  { fn: "Yannick", ln: "Ngoma", email: "yannick.ngoma@college-excellence.cg", subj: "SVT" },
  { fn: "Esther", ln: "Biyoko", email: "esther.biyoko@college-excellence.cg", subj: "Histoire-Géo" },
];

const SUBJECTS = ["Français", "Mathématiques", "Anglais", "SVT", "Histoire-Géo", "Physique-Chimie", "EPS", "Arts Plastiques"];

const CLASSES = [
  { name: "6ème A", level: "6ème" },
  { name: "5ème A", level: "5ème" },
  { name: "4ème A", level: "4ème" },
];

const STUDENTS_BY_CLASS = {
  "6ème A": [
    { fn: "Joël", ln: "Mavoungou" }, { fn: "Précieuse", ln: "Boukaka" },
    { fn: "Héritier", ln: "Ntoumi" }, { fn: "Bénédicte", ln: "Moussavou" },
    { fn: "Arsène", ln: "Mabiala" }, { fn: "Diane", ln: "Ngouabi" },
  ],
  "5ème A": [
    { fn: "Landry", ln: "Kouka" }, { fn: "Fidélia", ln: "Mpassi" },
    { fn: "Cédric", ln: "Mouyabi" }, { fn: "Ornella", ln: "Banzouzi" },
    { fn: "Juvénal", ln: "Tsaty" }, { fn: "Mireille", ln: "Gombé" },
    { fn: "Pascal", ln: "Matingou" },
  ],
  "4ème A": [
    { fn: "Sylvain", ln: "Moukolo" }, { fn: "Ruth", ln: "Kibangou" },
    { fn: "Fabrice", ln: "Missengué" }, { fn: "Aurélie", ln: "Bikouti" },
    { fn: "Christian", ln: "Mfoutou" }, { fn: "Yvette", ln: "Mambou" },
  ],
};

function slug(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
}

async function ss(page, name) {
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch (_) {}
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.resolve(CAPTURES, name), fullPage: false });
  console.log(`  📸 ${name}`);
}

async function fill(page, sel, val) {
  await page.waitForSelector(sel, { timeout: 8000 });
  await page.fill(sel, val);
}

async function click(page, sel) {
  await page.waitForSelector(sel, { timeout: 10000 });
  await page.click(sel);
}

async function apiPost(page, url, body) {
  return page.evaluate(async ({ url, body }) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data;
    try { data = await res.json(); } catch (_) { data = {}; }
    return { ok: res.ok, status: res.status, data };
  }, { url, body });
}

async function apiGet(page, url) {
  return page.evaluate(async (u) => {
    const res = await fetch(u);
    let data;
    try { data = await res.json(); } catch (_) { data = {}; }
    return { ok: res.ok, status: res.status, data };
  }, url);
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(CAPTURES, { recursive: true });
  fs.mkdirSync(ERRORS, { recursive: true });

  console.log("═════════════════════════════════════════════════");
  console.log("  GESchool — Démo marketing automatisée");
  console.log("═════════════════════════════════════════════════\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // ════════════════════════════════════════════════════════════
    // PHASE 1: Register School & Login
    // ════════════════════════════════════════════════════════════
    console.log("═══ PHASE 1: Création de l'école ═══\n");

    const ctx = await browser.newContext({
      locale: "fr-FR",
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    console.log("  Ouverture de la page d'inscription...");
    await page.goto(`${BASE}/register`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    console.log(`  URL: ${page.url()}`);

    // Check if already registered — try to go directly to admin
    await page.goto(`${BASE}/${SCHOOL.subdomain}/admin`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});

    if (page.url().includes("/login")) {
      console.log("  Page de login détectée — tentative de connexion...");
      await fill(page, 'input[name="email"]', SCHOOL.email);
      await fill(page, 'input[name="password"]', SCHOOL.password);
      await click(page, "button[type=submit]");
      await page.waitForTimeout(5000);

      if (page.url().includes("/login")) {
        console.log("  ⚠️  Login échoué — procédure d'inscription complète...");
        await page.goto(`${BASE}/register`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
        await ss(page, "admin-00-registration.png");

        await fill(page, 'input[name="firstName"]', SCHOOL.firstName);
        await fill(page, 'input[name="lastName"]', SCHOOL.lastName);
        await fill(page, 'input[name="email"]', SCHOOL.email);
        await fill(page, 'input[name="password"]', SCHOOL.password);
        await fill(page, 'input[name="schoolName"]', SCHOOL.schoolName);
        await fill(page, 'input[name="subdomain"]', SCHOOL.subdomain);
        await ss(page, "admin-01-form-filled.png");

        await click(page, "button[type=submit]");
        await page.waitForTimeout(5000);
        console.log(`  Après soumission: ${page.url()}`);

        // Try login
        if (page.url().includes("/login")) {
          await ss(page, "admin-02-registered.png");
          await fill(page, 'input[name="email"]', SCHOOL.email);
          await fill(page, 'input[name="password"]', SCHOOL.password);
          await click(page, "button[type=submit]");
          await page.waitForTimeout(5000);
        }
      }
    }

    // Navigate to admin dashboard
    await page.goto(`${BASE}/${SCHOOL.subdomain}/admin`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log(`  Dashboard URL: ${page.url()}`);

    if (page.url().includes("/login")) {
      // Login again at school-specific URL
      await fill(page, 'input[name="email"]', SCHOOL.email);
      await fill(page, 'input[name="password"]', SCHOOL.password);
      await click(page, "button[type=submit]");
      await page.waitForTimeout(5000);
      await page.goto(`${BASE}/${SCHOOL.subdomain}/admin`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    await ss(page, "admin-03-dashboard.png");
    console.log("  ✅ Connecté\n");

    // ════════════════════════════════════════════════════════════
    // PHASE 2: Seed data
    // ════════════════════════════════════════════════════════════
    console.log("═══ PHASE 2: Création des données ═══\n");

    // 1. Create subjects
    console.log("  Matières...");
    for (const s of SUBJECTS) {
      const r = await apiPost(page, `/api/subjects`, { name: s });
      console.log(`    ${s}: ${r.ok ? "✅" : `❌ ${r.status}`}`);
    }

    // 2. Get or create academic year
    let ayRes = await apiGet(page, `/api/academic-years`);
    let ayList = ayRes.data?.data || ayRes.data || [];
    let ayId;
    if (Array.isArray(ayList) && ayList.length > 0) {
      ayId = ayList[0].id;
      console.log(`\n  Année scolaire trouvée: ${ayList[0].name || ayId}`);
    } else {
      console.log(`\n  Création de l'année scolaire...`);
      const year = new Date().getFullYear();
      const r = await apiPost(page, `/api/academic-years`, {
        name: `${year}-${year + 1}`,
        start_date: `${year}-09-01`,
        end_date: `${year + 1}-08-31`,
        is_active: true,
      });
      console.log(`    ${r.ok ? "✅" : `❌ ${r.status}`}`);
      if (r.ok) ayId = r.data?.id;
      else {
        // Try GET again
        ayRes = await apiGet(page, `/api/academic-years`);
        ayList = ayRes.data?.data || ayRes.data || [];
        if (Array.isArray(ayList) && ayList.length > 0) ayId = ayList[0].id;
      }
    }

    if (!ayId) {
      console.log("  ⚠️  Impossible de récupérer/créer l'année scolaire. Utilisation d'un UUID fixe.");
    }
    console.log(`  ID année scolaire: ${ayId}`);

    // 3. Create classes
    console.log("\n  Classes...");
    const classMap = {};
    for (const c of CLASSES) {
      const r = await apiPost(page, `/api/classes`, {
        name: c.name,
        level: c.level,
        academic_year_id: ayId,
        capacity: 35,
      });
      const status = r.ok ? "✅" : `❌ ${r.status} ${JSON.stringify(r.data).slice(0, 80)}`;
      console.log(`    ${c.name}: ${status}`);
      if (r.ok && r.data?.id) classMap[c.name] = r.data.id;
    }

    // If classes failed, try getting existing ones
    if (Object.keys(classMap).length === 0) {
      const cr = await apiGet(page, `/api/classes`);
      const cl = cr.data?.data || cr.data || [];
      if (Array.isArray(cl)) {
        for (const c of cl) classMap[c.name] = c.id;
        console.log(`  Classes existantes: ${Object.keys(classMap).join(", ")}`);
      }
    }

    // 4. Get subject IDs
    const sr = await apiGet(page, `/api/subjects`);
    const sl = sr.data?.data || sr.data || [];
    const subjMap = {};
    if (Array.isArray(sl)) for (const s of sl) subjMap[s.name] = s.id;
    console.log(`\n  Matières: ${Object.keys(subjMap).length} trouvées`);

    // 5. Create teachers
    console.log("\n  Enseignants...");
    const teacherInfos = [];
    for (const t of TEACHERS) {
      const r = await apiPost(page, `/api/teachers`, {
        first_name: t.fn, last_name: t.ln, email: t.email,
        password: PWD, phone: "+242 06 555 10 01",
      });
      console.log(`    ${t.fn} ${t.ln}: ${r.ok ? "✅" : `❌ ${r.status}`}`);
      if (r.ok && r.data?.id) teacherInfos.push({ id: r.data.id, subject: t.subj });
    }

    // 6. Assign teachers to subjects
    console.log("\n  Affectation...");
    for (const ti of teacherInfos) {
      const sj = subjMap[ti.subject];
      if (!sj) { console.log(`    ⚠️ ${ti.subject} non trouvée`); continue; }
      const r = await apiPost(page, `/api/teacher-subjects`, { teacher_id: ti.id, subject_id: sj });
      console.log(`    ${ti.subject}: ${r.ok ? "✅" : `❌ ${r.status}`}`);
    }

    // 7. Create students
    console.log("\n  Élèves...");
    let stuIdx = 1;
    const allStudents = [];
    for (const [cn, students] of Object.entries(STUDENTS_BY_CLASS)) {
      const cid = classMap[cn];
      if (!cid) { console.log(`    ⚠️ Classe ${cn} non trouvée`); continue; }
      for (const s of students) {
        const email = `${slug(s.fn)}.${slug(s.ln)}@college-excellence.cg`;
        const r = await apiPost(page, `/api/students`, {
          first_name: s.fn, last_name: s.ln, email,
          password: PWD, class_id: cid,
          matricule: `CE-${String(stuIdx).padStart(3, "0")}`,
          date_of_birth: "2010-01-15", place_of_birth: "Brazzaville", gender: s.fn.endsWith("e") || ["Précieuse","Bénédicte","Diane","Fidélia","Ornella","Mireille","Ruth","Aurélie","Yvette"].includes(s.fn) ? "F" : "M",
        });
        const status = r.ok ? "✅" : `❌ ${r.status} ${JSON.stringify(r.data).slice(0, 100)}`;
        console.log(`    ${s.fn} ${s.ln}: ${status}`);
        if (r.ok && r.data?.id) allStudents.push({ id: r.data.id, fn: s.fn, ln: s.ln, email, cn });
        stuIdx++;
      }
    }
    console.log(`  Total: ${allStudents.length} élèves`);

    // 8. Create parents
    console.log("\n  Parents...");
    const parentEmails = new Set();
    for (let i = 0; i < allStudents.length; i += 2) {
      const group = allStudents.slice(i, i + 2);
      const ln = group[0].ln;
      const pe = `parent.${slug(ln)}@college-excellence.cg`;
      if (parentEmails.has(pe)) continue;
      parentEmails.add(pe);
      const r = await apiPost(page, `/api/parents`, {
        first_name: ln, last_name: "Famille", email: pe,
        password: PWD, phone: "+242 06 555 00 01",
        student_ids: group.map((s) => s.id),
      });
      console.log(`    Parent ${ln}: ${r.ok ? "✅" : `❌ ${r.status}`}`);
    }

    // ════════════════════════════════════════════════════════════
    // PHASE 3: Admin Desktop Screenshots
    // ════════════════════════════════════════════════════════════
    console.log("\n═══ PHASE 3: Admin Desktop ═══\n");
    const DB = `${BASE}/${SCHOOL.subdomain}`;

    for (const [url, name] of [
      [`${DB}/admin`, "admin-04-dashboard-data"],
      [`${DB}/admin/students`, "admin-05-students"],
      [`${DB}/admin/teachers`, "admin-06-teachers"],
      [`${DB}/admin/schedule`, "admin-07-schedule"],
      [`${DB}/admin/subjects`, "admin-08-subjects"],
      [`${DB}/admin/classes`, "admin-09-classes"],
      [`${DB}/admin/assignments`, "admin-10-assignments"],
    ]) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await ss(page, `${name}.png`);
    }

    await ctx.close();

    // ════════════════════════════════════════════════════════════
    // PHASE 4: Teacher Mobile
    // ════════════════════════════════════════════════════════════
    console.log("\n═══ PHASE 4: Enseignant Mobile ═══\n");

    const mobCtx = await browser.newContext({
      locale: "fr-FR", viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const mobPage = await mobCtx.newPage();

    const teacher = TEACHERS[0];
    await mobPage.goto(`${DB}/login`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await fill(mobPage, 'input[name="email"]', teacher.email);
    await fill(mobPage, 'input[name="password"]', PWD);
    await click(mobPage, "button[type=submit]");
    await mobPage.waitForTimeout(5000);
    await ss(mobPage, "mobile-teacher-01-dashboard.png");

    for (const [url, name] of [
      [`${DB}/teacher/schedule`, "mobile-teacher-02-schedule"],
      [`${DB}/teacher/assignments`, "mobile-teacher-03-assignments"],
      [`${DB}/teacher/grades`, "mobile-teacher-04-grades"],
      [`${DB}/teacher/attendance`, "mobile-teacher-05-attendance"],
    ]) {
      await mobPage.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await mobPage.waitForTimeout(2000);
      await ss(mobPage, `${name}.png`);
    }
    await mobCtx.close();

    // ════════════════════════════════════════════════════════════
    // PHASE 5: Parent Mobile
    // ════════════════════════════════════════════════════════════
    console.log("\n═══ PHASE 5: Parent Mobile ═══\n");

    const parCtx = await browser.newContext({
      locale: "fr-FR", viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const parPage = await parCtx.newPage();

    const firstKid = allStudents[0];
    const parentEmail = `parent.${slug(firstKid.ln)}@college-excellence.cg`;

    await parPage.goto(`${DB}/login`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await fill(parPage, 'input[name="email"]', parentEmail);
    await fill(parPage, 'input[name="password"]', PWD);
    await click(parPage, "button[type=submit]");
    await parPage.waitForTimeout(5000);
    await ss(parPage, "mobile-parent-01-dashboard.png");

    for (const [url, name] of [
      [`${DB}/parent/children/${firstKid.id}/assignments`, "mobile-parent-02-assignments"],
      [`${DB}/parent/children/${firstKid.id}/schedule`, "mobile-parent-03-schedule"],
      [`${DB}/parent/children/${firstKid.id}/grades`, "mobile-parent-04-grades"],
      [`${DB}/parent/messages`, "mobile-parent-05-messages"],
    ]) {
      await parPage.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await parPage.waitForTimeout(2000);
      await ss(parPage, `${name}.png`);
    }
    await parCtx.close();

    // ════════════════════════════════════════════════════════════
    // PHASE 6: Student Mobile
    // ════════════════════════════════════════════════════════════
    console.log("\n═══ PHASE 6: Élève Mobile ═══\n");

    const stuCtx = await browser.newContext({
      locale: "fr-FR", viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const stuPage = await stuCtx.newPage();

    await stuPage.goto(`${DB}/login`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await fill(stuPage, 'input[name="email"]', firstKid.email);
    await fill(stuPage, 'input[name="password"]', PWD);
    await click(stuPage, "button[type=submit]");
    await stuPage.waitForTimeout(5000);
    await ss(stuPage, "mobile-student-01-dashboard.png");

    for (const [url, name] of [
      [`${DB}/student/grades`, "mobile-student-02-grades"],
      [`${DB}/student/courses`, "mobile-student-03-courses"],
      [`${DB}/student/schedule`, "mobile-student-04-schedule"],
      [`${DB}/student/assignments`, "mobile-student-05-assignments"],
    ]) {
      await stuPage.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await stuPage.waitForTimeout(2000);
      await ss(stuPage, `${name}.png`);
    }
    await stuCtx.close();

    // ════════════════════════════════════════════════════════════
    // PHASE 7: Generate sequence.md
    // ════════════════════════════════════════════════════════════
    console.log("\n═══ GÉNÉRATION sequence.md ═══\n");

    const CAPTION = {
      "admin-00-registration.png": "Créez votre établissement en quelques secondes",
      "admin-01-form-filled.png": "Remplissez vos informations : prénom, nom, email, sous-domaine",
      "admin-02-registered.png": "Compte créé ! Connectez-vous immédiatement",
      "admin-03-dashboard.png": "Tableau de bord administrateur — vue d'ensemble",
      "admin-04-dashboard-data.png": "Statistiques en temps réel : effectifs, présences, performances",
      "admin-05-students.png": "Liste complète des élèves avec recherche intégrée",
      "admin-06-teachers.png": "Gestion des enseignants — affectations et coordination",
      "admin-07-schedule.png": "Emploi du temps — planification visuelle par classe",
      "admin-08-subjects.png": "Matières enseignées — personnalisation complète",
      "admin-09-classes.png": "Organisation des classes, de la 6ème à la Terminale",
      "admin-10-assignments.png": "Devoirs et TD/TP — suivi et validation",
      "mobile-teacher-01-dashboard.png": "Mon tableau de bord enseignant — au cœur de ma journée",
      "mobile-teacher-02-schedule.png": "Mon emploi du temps — toujours savoir où je dois être",
      "mobile-teacher-03-assignments.png": "Publier un devoir/TD en un clic depuis mon téléphone",
      "mobile-teacher-04-grades.png": "Saisie des notes — la moyenne se calcule automatiquement",
      "mobile-teacher-05-attendance.png": "Appel en un clic — suivi de présence temps réel",
      "mobile-parent-01-dashboard.png": "Suivez la scolarité de votre enfant depuis votre téléphone",
      "mobile-parent-02-assignments.png": "Devoirs à rendre — notification automatique des échéances",
      "mobile-parent-03-schedule.png": "Emploi du temps de mon enfant — je sais où il est",
      "mobile-parent-04-grades.png": "Notes et moyennes en temps réel",
      "mobile-parent-05-messages.png": "Communication directe avec les enseignants",
      "mobile-student-01-dashboard.png": "Mon espace élève — tout au même endroit",
      "mobile-student-02-grades.png": "Mes notes — voir ma progression en temps réel",
      "mobile-student-03-courses.png": "Mes cours — supports pédagogiques et pièces jointes",
      "mobile-student-04-schedule.png": "Mon emploi du temps du jour",
      "mobile-student-05-assignments.png": "Mes devoirs — échéances et suivi de complétion",
    };

    const CATEGORIES = [
      { title: "Séquence 1 — Admin : Mise en place (Desktop)", prefix: "admin" },
      { title: "Séquence 2 — Enseignant : Usage quotidien (Mobile)", prefix: "mobile-teacher" },
      { title: "Séquence 3 — Parent : Suivi en temps réel (Mobile)", prefix: "mobile-parent" },
      { title: "Séquence 4 — Élève : Espace personnel (Mobile)", prefix: "mobile-student" },
    ];

    let md = "# GESchool — Ordre de montage vidéo marketing\n\n";
    md += `*Généré le ${new Date().toLocaleDateString("fr-FR")}*\n\n`;

    for (const cat of CATEGORIES) {
      md += `## ${cat.title}\n`;
      md += "| # | Image | Légende |\n|---|---|---|\n";
      let idx = 1;
      const files = fs.readdirSync(CAPTURES).filter((f) => f.startsWith(cat.prefix) && f.endsWith(".png")).sort();
      for (const f of files) {
        md += `| ${idx++} | ${f} | ${CAPTION[f] || "—"} |\n`;
      }
      md += "\n";
    }

    md += "---\n### Message marketing clé\n\n";
    md += "GESchool n'est pas juste un outil pour la direction — c'est un écosystème où ";
    md += "**direction, enseignants, parents ET élèves** sont connectés en temps réel, ";
    md += "accessible entièrement depuis un smartphone, pensé pour le Congo.\n";

    fs.writeFileSync(path.resolve(CAPTURES, "sequence.md"), md, "utf-8");
    console.log("  ✅ sequence.md généré");

    console.log(`\n═══ ✅ DÉMO TERMINÉE ═══`);
    console.log(`  Captures: ${CAPTURES}`);
    const pngCount = fs.readdirSync(CAPTURES).filter((f) => f.endsWith(".png")).length;
    console.log(`  ${pngCount} captures produites`);

  } catch (err) {
    console.error(`\n❌ ERREUR: ${err.message}`);
    console.error(err.stack);
    try {
      const pages = browser.contexts()[0]?.pages();
      if (pages?.length) {
        await pages[0].screenshot({ path: path.resolve(ERRORS, "fatal-error.png"), fullPage: true });
        console.log("  Capture d'erreur → erreurs/");
      }
    } catch (_) {}
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
