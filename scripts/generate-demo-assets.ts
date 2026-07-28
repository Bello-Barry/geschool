import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://geschool.vercel.app';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2eGFoY3Z5ZWpzeG1scmlyaGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTkzNjAsImV4cCI6MjA4NzMzNTM2MH0.M6_TK_8D4arazj55Az0IgFmuu3vAG9l365jOTz5X3Xc';
const RANDOM_SUFFIX = Math.random().toString(36).slice(2, 8);
const SCHOOL_SUBDOMAIN = `excellence-${RANDOM_SUFFIX}`;
const SCHOOL_NAME = 'Collège Excellence';
const ADMIN_EMAIL = `directeur@excellence-${RANDOM_SUFFIX}.cd`;
const ADMIN_PASSWORD = 'Excellence2026!';

// Realistic Congolese names for seeding
const CO_STUDENTS = [
  // 6ème A
  { fn: 'Alain', ln: 'Ngouabi', gender: 'M', className: '6ème A', dob: '2014-03-12' },
  { fn: 'Grace', ln: 'Mavoungou', gender: 'F', className: '6ème A', dob: '2014-07-22' },
  { fn: 'Hervé', ln: 'Nguesso', gender: 'M', className: '6ème A', dob: '2014-11-05' },
  { fn: 'Chantal', ln: 'Milandou', gender: 'F', className: '6ème A', dob: '2014-01-18' },
  { fn: 'Landry', ln: 'Makosso', gender: 'M', className: '6ème A', dob: '2013-12-05' },
  // 5ème A
  { fn: 'Dieudonné', ln: 'Poaty', gender: 'M', className: '5ème A', dob: '2013-05-14' },
  { fn: 'Esther', ln: 'Boungou', gender: 'F', className: '5ème A', dob: '2013-08-25' },
  { fn: 'Justin', ln: 'Kinkela', gender: 'M', className: '5ème A', dob: '2013-10-09' },
  { fn: 'Karine', ln: 'Bakala', gender: 'F', className: '5ème A', dob: '2013-02-28' },
  { fn: 'Mireille', ln: 'Mbemba', gender: 'F', className: '5ème A', dob: '2013-06-11' },
  // 4ème A
  { fn: 'Roch', ln: 'Okombi', gender: 'M', className: '4ème A', dob: '2012-09-17' },
  { fn: 'Parfait', ln: 'Kolélas', gender: 'M', className: '4ème A', dob: '2012-04-03' },
  { fn: 'Ghislain', ln: 'Lissouba', gender: 'M', className: '4ème A', dob: '2012-07-19' },
  { fn: 'Clotilde', ln: 'Dzabatou', gender: 'F', className: '4ème A', dob: '2012-01-30' },
  { fn: 'Christ', ln: 'Loubaki', gender: 'M', className: '4ème A', dob: '2012-10-24' }
];

function normalizeForEmail(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, ''); // keep only lower alphanumeric, dots, and hyphens
}

async function run() {
  console.log('🚀 Starting GESchool Seeding & Navigation script...');
  console.log(`🏫 School: ${SCHOOL_NAME} (subdomain: ${SCHOOL_SUBDOMAIN})`);
  console.log(`👤 Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Listen to browser console to forward logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
  });

  try {
    // Ensure captures folder exists
    const capturesDir = path.join(process.cwd(), 'captures');
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true });
    }

    // 1. REGISTER THE SCHOOL
    console.log('\n--- Step 1: Registering School ---');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'load' });
    await page.fill('input[name="firstName"]', 'Directeur');
    await page.fill('input[name="lastName"]', 'Excellence');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.fill('input[name="schoolName"]', SCHOOL_NAME);
    await page.fill('input[name="subdomain"]', SCHOOL_SUBDOMAIN);

    // Click register button and wait for redirect to dashboard
    await Promise.all([
      page.waitForURL(`**/${SCHOOL_SUBDOMAIN}/**`, { timeout: 60000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState('networkidle');
    console.log('✅ Registered school successfully.');

    // Wait for session and verify
    await page.waitForTimeout(4000);
    const debugResponse = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/debug-auth`);
      return await r.json();
    }, BASE_URL);

    const schoolId = debugResponse?.headers?.['x-school-id'];
    console.log(`🏫 School ID: ${schoolId}`);
    if (!schoolId) {
      throw new Error('Failed to retrieve school ID!');
    }

    // 2. SEED ACADEMIC YEAR
    console.log('\n--- Step 2: Seeding Academic Year ---');
    const academicYear = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/academic-years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '2025-2026',
          start_date: '2025-09-01',
          end_date: '2026-07-31',
          is_current: true,
        }),
      });
      return r.ok ? await r.json() : null;
    }, BASE_URL);

    if (!academicYear) throw new Error('Academic Year creation failed!');
    const academicYearId = academicYear.id;
    console.log(`✅ Academic Year created (ID: ${academicYearId})`);

    // Wait for the DB trigger to complete creating terms
    await page.waitForTimeout(4000);

    // 3. RETRIEVE AUTO-CREATED TERMS AND ACTIVATE TERM 1
    console.log('\n--- Step 3: Activating Term 1 ---');
    const termsList = await page.evaluate(async ({ yearId, key }) => {
      const cookieValue = document.cookie.split('; ').find(row => row.startsWith('sb-wvxahcvyejsxmlrirhdr-auth-token='));
      if (!cookieValue) return [];
      let rawVal = decodeURIComponent(cookieValue.split('=')[1]);
      if (rawVal.startsWith('base64-')) {
        rawVal = atob(rawVal.substring(7));
      }
      const tokenData = JSON.parse(rawVal);
      const accessToken = tokenData.access_token;

      const r = await fetch(`https://wvxahcvyejsxmlrirhdr.supabase.co/rest/v1/terms?academic_year_id=eq.${yearId}`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return r.ok ? await r.json() : [];
    }, { yearId: academicYearId, key: SUPABASE_ANON_KEY });

    if (termsList.length === 0) throw new Error('No terms auto-created!');
    console.log(`🔍 Found ${termsList.length} terms.`);

    const t1 = termsList.find((t: any) => t.term_number === 1);
    if (!t1) throw new Error('Trimestre 1 not found!');
    const term1Id = t1.id;

    // Activate term 1 via API
    await page.evaluate(async ({ base, termId }) => {
      await fetch(`${base}/api/terms/${termId}/activate`, { method: 'POST' });
    }, { base: BASE_URL, termId: term1Id });
    console.log(`✅ Activated Term 1: ${t1.name} (${term1Id})`);

    // 4. CUSTOMIZE SCHOOL DETAILS
    console.log('\n--- Step 4: Customizing School ---');
    await page.goto(`${BASE_URL}/${SCHOOL_SUBDOMAIN}/admin/school`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.fill('input[placeholder="+242 06 123 4567"]', '+242 06 612 34 56');
    await page.fill('input[type="email"]', `contact@${SCHOOL_SUBDOMAIN}.cd`);
    await page.fill('input[placeholder="Brazzaville, Congo"]', 'Avenue de la Paix, Brazzaville, Congo');
    await page.evaluate(() => {
      const el = document.querySelector('input[type="color"]') as HTMLInputElement;
      if (el) { el.value = "#0F766E"; el.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    await page.click('button:has-text("Enregistrer")');
    await page.waitForTimeout(2000);
    console.log('✅ Customized school details.');

    // 5. CREATE CLASSES
    console.log('\n--- Step 5: Seeding Classes ---');
    const classes = ['6ème A', '5ème A', '4ème A'];
    const classIds: Record<string, string> = {};

    for (const clsName of classes) {
      const cls = await page.evaluate(async ({ base, name, yearId }) => {
        const r = await fetch(`${base}/api/classes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            level: name.split(' ')[0],
            academic_year_id: yearId,
            capacity: 35
          })
        });
        return r.ok ? await r.json() : null;
      }, { base: BASE_URL, name: clsName, yearId: academicYearId });

      if (!cls) throw new Error(`Failed to create class ${clsName}`);
      classIds[clsName] = cls.id;
      console.log(`   Class: ${clsName} → ID: ${cls.id}`);
    }

    // 6. CREATE SUBJECTS
    console.log('\n--- Step 6: Seeding Subjects ---');
    const subjectData = [
      { name: 'Mathématiques', code: 'MATH', coefficient: 5 },
      { name: 'Français', code: 'FR', coefficient: 4 },
      { name: 'Anglais', code: 'ANG', coefficient: 3 },
      { name: 'Histoire-Géographie', code: 'HG', coefficient: 3 }
    ];
    const subjectIds: Record<string, string> = {};

    for (const sub of subjectData) {
      const s = await page.evaluate(async ({ base, subData }) => {
        const r = await fetch(`${base}/api/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subData)
        });
        return r.ok ? await r.json() : null;
      }, { base: BASE_URL, subData: sub });

      if (!s) throw new Error(`Failed to create subject ${sub.name}`);
      subjectIds[sub.name] = s.id;
      console.log(`   Subject: ${sub.name} → ID: ${s.id}`);
    }

    // 7. CREATE TEACHERS
    console.log('\n--- Step 7: Seeding Teachers ---');
    const teacherData = [
      { first_name: 'Mamadou', last_name: 'Ngouabi', email: `mamadou.ngouabi@excellence-${RANDOM_SUFFIX}.cd`, specialization: 'Mathématiques', password: 'password123' },
      { first_name: 'Mariama', last_name: 'Mavoungou', email: `mariama.mavoungou@excellence-${RANDOM_SUFFIX}.cd`, specialization: 'Français', password: 'password123' }
    ];
    const teachers: Array<any> = [];

    for (const teach of teacherData) {
      const t = await page.evaluate(async ({ base, tData }) => {
        const r = await fetch(`${base}/api/teachers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tData)
        });
        return r.ok ? await r.json() : null;
      }, { base: BASE_URL, tData: teach });

      if (!t) throw new Error(`Failed to create teacher ${teach.first_name}`);
      teachers.push({
        id: t.id,
        user_id: t.user_id,
        email: teach.email,
        pw: teach.password,
        fn: teach.first_name,
        ln: teach.last_name
      });
      console.log(`   Teacher: ${teach.first_name} ${teach.last_name} → ID: ${t.id} (user_id: ${t.user_id})`);
    }

    // Assign Mamadou to Math and Histoire-Géographie across classes
    // Assign Mariama to Français and Anglais across classes
    console.log('\n--- Linking Teachers to Subjects & Classes ---');
    const mamadou = teachers[0];
    const mariama = teachers[1];

    const teacherAssignments = [
      { teacher_id: mamadou.id, subject_id: subjectIds['Mathématiques'], class_id: classIds['6ème A'] },
      { teacher_id: mamadou.id, subject_id: subjectIds['Mathématiques'], class_id: classIds['5ème A'] },
      { teacher_id: mamadou.id, subject_id: subjectIds['Histoire-Géographie'], class_id: classIds['4ème A'] },
      { teacher_id: mariama.id, subject_id: subjectIds['Français'], class_id: classIds['6ème A'] },
      { teacher_id: mariama.id, subject_id: subjectIds['Français'], class_id: classIds['5ème A'] },
      { teacher_id: mariama.id, subject_id: subjectIds['Anglais'], class_id: classIds['4ème A'] }
    ];

    for (const assign of teacherAssignments) {
      await page.evaluate(async ({ base, data }) => {
        const r = await fetch(`${base}/api/teacher-subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!r.ok) {
          console.error(`Failed to assign: ${r.status} - ${await r.text()}`);
        }
      }, { base: BASE_URL, data: assign });
    }
    console.log('✅ Connected teachers to subjects & classes.');

    // 8. CREATE STUDENTS
    console.log('\n--- Step 8: Seeding Students ---');
    const students: Array<any> = [];
    let matCounter = 1;

    for (const std of CO_STUDENTS) {
      const matricule = `EXC-${RANDOM_SUFFIX}-${String(matCounter++).padStart(4, '0')}`;
      const email = `${normalizeForEmail(std.fn)}.${normalizeForEmail(std.ln)}@excellence-${RANDOM_SUFFIX}.cd`;

      const s = await page.evaluate(async ({ base, stdData }) => {
        const r = await fetch(`${base}/api/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stdData)
        });
        if (!r.ok) {
          const text = await r.text();
          console.error(`[API ERROR] Failed to seed student: ${r.status} - ${text}`);
          return null;
        }
        return await r.json();
      }, {
        base: BASE_URL,
        stdData: {
          matricule,
          first_name: std.fn,
          last_name: std.ln,
          email,
          class_id: classIds[std.className],
          date_of_birth: std.dob,
          gender: std.gender
        }
      });

      if (!s) throw new Error(`Failed to create student ${std.fn} ${std.ln}`);
      students.push({
        id: s.id,
        user_id: s.user_id,
        email,
        pw: s.tempPassword,
        class_id: classIds[std.className],
        fn: std.fn,
        ln: std.ln,
        matricule
      });
      console.log(`   Student: ${std.fn} ${std.ln} → ID: ${s.id} (user_id: ${s.user_id})`);
    }

    // 9. CREATE PARENTS
    console.log('\n--- Step 9: Seeding Parents ---');
    const parentData = [
      { fn: 'Guy', ln: 'Ngouabi', email: `guy.ngouabi@excellence-${RANDOM_SUFFIX}.cd`, phone: '+242 06 111 22 33', rel: 'Père', childEmail: `alain.ngouabi@excellence-${RANDOM_SUFFIX}.cd` },
      { fn: 'Armel', ln: 'Mavoungou', email: `armel.mavoungou@excellence-${RANDOM_SUFFIX}.cd`, phone: '+242 06 222 33 44', rel: 'Père', childEmail: `grace.mavoungou@excellence-${RANDOM_SUFFIX}.cd` },
      { fn: 'Béatrice', ln: 'Dzabatou', email: `beatrice.dzabatou@excellence-${RANDOM_SUFFIX}.cd`, phone: '+242 06 333 44 55', rel: 'Mère', childEmail: `clotilde.dzabatou@excellence-${RANDOM_SUFFIX}.cd` }
    ];
    const parents: Array<any> = [];

    for (const par of parentData) {
      const childEmailNormalized = `${normalizeForEmail(par.childEmail.split('@')[0])}@excellence-${RANDOM_SUFFIX}.cd`;
      const child = students.find((s: any) => s.email === childEmailNormalized);
      if (!child) throw new Error(`Child not found for parent ${par.fn}`);

      const email = `${normalizeForEmail(par.fn)}.${normalizeForEmail(par.ln)}@excellence-${RANDOM_SUFFIX}.cd`;

      const p = await page.evaluate(async ({ base, parData }) => {
        const r = await fetch(`${base}/api/parents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parData)
        });
        if (!r.ok) {
          const text = await r.text();
          console.error(`[API ERROR] Failed to seed parent: ${r.status} - ${text}`);
          return null;
        }
        return await r.json();
      }, {
        base: BASE_URL,
        parData: {
          first_name: par.fn,
          last_name: par.ln,
          email,
          phone: par.phone,
          relationship: par.rel,
          student_ids: [child.id],
          password: 'password123'
        }
      });

      if (!p) throw new Error(`Failed to create parent ${par.fn}`);
      parents.push({
        id: p.id,
        user_id: p.user_id,
        email,
        pw: p.tempPassword,
        fn: par.fn,
        ln: par.ln,
        childEmail: child.email
      });
      console.log(`   Parent: ${par.fn} ${par.ln} → ID: ${p.id} (user_id: ${p.user_id})`);
    }

    // 10. SEED GRADES (NOTES)
    console.log('\n--- Step 10: Seeding Student Grades ---');
    const gradesTypes = ['homework', 'test', 'exam'] as const;
    let gradesCount = 0;

    for (const student of students) {
      const targetSubjects = Object.keys(subjectIds);
      for (const subName of targetSubjects) {
        const subjectId = subjectIds[subName];
        const baseScore = 11 + Math.floor(Math.random() * 8); // 11 to 18

        for (let i = 0; i < 2; i++) {
          const type = gradesTypes[i];
          const offset = Math.floor(Math.random() * 5) - 2; // -2 to +2
          const score = Math.max(0, Math.min(20, baseScore + offset));

          await page.evaluate(async ({ base, gradeData }) => {
            await fetch(`${base}/api/grades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(gradeData)
            });
          }, {
            base: BASE_URL,
            gradeData: {
              student_id: student.id,
              subject_id: subjectId,
              term_id: term1Id,
              grade_type: type,
              score,
              max_score: 20,
              date: '2025-10-15',
              comments: i === 0 ? 'Très bon travail en classe' : 'Bonne participation'
            }
          });
          gradesCount++;
        }
      }
    }
    console.log(`✅ Seeded ${gradesCount} grades across students.`);

    // 11. SEED ATTENDANCE RECORDS
    console.log('\n--- Step 11: Seeding Attendance ---');
    const todayStr = new Date().toISOString().split('T')[0];

    for (const clsName of classes) {
      const classId = classIds[clsName];
      const classStudents = students.filter((s: any) => s.class_id === classId);

      const attendanceRecords = classStudents.map((s: any, idx: number) => {
        let status: 'present' | 'absent' | 'late' = 'present';
        let reason = '';
        if (idx === 0) {
          status = 'late';
          reason = 'Retard de bus';
        } else if (idx === 1) {
          status = 'absent';
          reason = 'Indisposé';
        }
        return {
          student_id: s.id,
          status,
          reason
        };
      });

      await page.evaluate(async ({ base, payload }) => {
        await fetch(`${base}/api/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }, {
        base: BASE_URL,
        payload: {
          class_id: classId,
          date: todayStr,
          records: attendanceRecords
        }
      });
    }
    console.log('✅ Seeded attendance records for today.');

    // 12. SEED COURSE PUBLICATION
    console.log('\n--- Step 12: Seeding Course Publication ---');
    const mamadouCourse = await page.evaluate(async ({ base, sId, cId, termId, tId }) => {
      const r = await fetch(`${base}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: tId,
          subject_id: sId,
          class_id: cId,
          term_id: termId,
          title: 'Algèbre linéaire et équations du premier degré',
          key_points: '- Comprendre les notions de base de l\'algèbre linéaire.\n- Savoir résoudre des équations simples à une inconnue.\n- Exemples pratiques appliqués aux finances de la maison.',
          status: 'published'
        })
      });
      return r.ok ? await r.json() : null;
    }, {
      base: BASE_URL,
      sId: subjectIds['Mathématiques'],
      cId: classIds['6ème A'],
      termId: term1Id,
      tId: mamadou.id
    });
    console.log(`✅ Seeded course publication: ${mamadouCourse?.title}`);

    // 13. SEED MESSAGING BETWEEN TEACHER AND PARENT
    console.log('\n--- Step 13: Seeding Conversation & Messages ---');
    const conv = await page.evaluate(async ({ base, participantIds }) => {
      const r = await fetch(`${base}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_ids: participantIds })
      });
      return r.ok ? await r.json() : null;
    }, { base: BASE_URL, participantIds: [parents[0].user_id] });

    if (!conv) throw new Error('Conversation seeding failed!');
    console.log(`🔍 Created conversation between Mamadou and Guy Ngouabi: ${conv.id}`);

    await page.evaluate(async ({ base, convId, content }) => {
      await fetch(`${base}/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    }, {
      base: BASE_URL,
      convId: conv.id,
      content: 'Bonjour Monsieur Ngouabi, Alain fait d\'excellents progrès en classe. Cependant, j\'ai remarqué qu\'il a oublié ses cahiers d\'exercices aujourd\'hui.'
    });

    const outputCredentials = {
      schoolName: SCHOOL_NAME,
      subdomain: SCHOOL_SUBDOMAIN,
      admin: { email: ADMIN_EMAIL, pw: ADMIN_PASSWORD },
      academicYearId,
      termIds: termsList.map((t: any) => t.id),
      classIds,
      subjectIds,
      teachers,
      students,
      parents
    };

    const credentialsFilePath = path.join(capturesDir, 'credentials.json');
    fs.writeFileSync(credentialsFilePath, JSON.stringify(outputCredentials, null, 2));
    console.log(`✅ Seeding complete. Credentials written to ${credentialsFilePath}.`);

  } catch (error) {
    console.error('❌ Seeding process failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  run();
}
