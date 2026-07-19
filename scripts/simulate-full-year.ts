import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const getEnv = (key: string): string | undefined => {
  const m = envContent.match(new RegExp(`${key}=(.+)`));
  return m?.[1]?.trim();
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')!;
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')!;
const ROOT_DOMAIN = getEnv('NEXT_PUBLIC_ROOT_DOMAIN') || 'localhost:3000';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SCHOOL_NAME = 'École Démo';
const SCHOOL_SUBDOMAIN = 'demo';
const SCHOOL_CODE = 'DEMO';
const ADMIN_EMAIL = 'admin@demo.ecole';
const ADMIN_PASSWORD = 'password123';
const DEFAULT_PASSWORD = 'password123';

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  SIMULATION ANNÉE COMPLÈTE`);
  console.log(`  ${SCHOOL_NAME} (${SCHOOL_SUBDOMAIN})`);
  console.log(`═══════════════════════════════════════\n`);

  // 0. Check if school already exists
  const { data: existing } = await admin.from('schools').select('id').eq('subdomain', SCHOOL_SUBDOMAIN).single();
  let schoolId: string;
  if (existing) {
    schoolId = existing.id;
    console.log(`ℹ️  L'école existe déjà (${schoolId}), réutilisation...`);
  } else {
    const { data: school } = await admin.from('schools').insert({
      name: SCHOOL_NAME, subdomain: SCHOOL_SUBDOMAIN, code: SCHOOL_CODE,
      primary_color: '#2563eb', is_active: true,
    }).select().single();
    if (!school) { console.error('❌ Échec création école'); return; }
    schoolId = school.id;
    console.log(`✅ École créée: ${school.name} (${schoolId})`);
  }

  // 1. Admin user
  console.log('\n👤 Création admin...');
  let adminUserId: string;
  const { data: existingAdmin } = await admin.from('users').select('id').eq('email', ADMIN_EMAIL).single();
  if (existingAdmin) {
    adminUserId = existingAdmin.id;
    console.log(`ℹ️  Admin existe déjà (${adminUserId})`);
  } else {
    const { data: authAdmin, error: ae } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true,
      user_metadata: { first_name: 'Admin', last_name: 'Demo', role: 'super_admin' },
    });
    if (ae) { console.error(`❌ Auth admin: ${ae.message}`); return; }
    adminUserId = authAdmin!.user.id;
    const { error: ue } = await admin.from('users').insert({
      id: adminUserId, school_id: schoolId, email: ADMIN_EMAIL,
      role: 'super_admin', first_name: 'Admin', last_name: 'Demo',
    });
    if (ue) { console.error(`❌ User admin: ${ue.message}`); return; }
    console.log(`✅ Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }
  const baseUrl = `http://${SCHOOL_SUBDOMAIN}.${ROOT_DOMAIN}`;

  // 2. Academic Year + Terms
  console.log('\n📅 Création année scolaire...');
  let yearId: string;
  const { data: existingYear } = await admin.from('academic_years').select('id').eq('school_id', schoolId).eq('is_current', true).single();
  if (existingYear) {
    yearId = existingYear.id;
    console.log(`ℹ️  Année existe: ${yearId}`);
  } else {
    const { data: year } = await admin.from('academic_years').insert({
      school_id: schoolId, name: '2025-2026', start_date: '2025-09-01', end_date: '2026-07-31', is_current: true,
    }).select().single();
    if (!year) { console.error('❌ Échec année'); return; }
    yearId = year.id;
    console.log(`✅ Année: ${year.name}`);
  }

  const termDefs = [
    { name: '1er Trimestre', num: 1, start: '2025-09-01', end: '2025-12-20' },
    { name: '2ème Trimestre', num: 2, start: '2026-01-05', end: '2026-04-04' },
    { name: '3ème Trimestre', num: 3, start: '2026-04-13', end: '2026-07-31' },
  ];
  const termIds: Record<string, string> = {};
  for (const td of termDefs) {
    const { data: existingTerm } = await admin.from('terms').select('id').eq('school_id', schoolId).eq('name', td.name).single();
    if (existingTerm) {
      termIds[td.name] = existingTerm.id;
    } else {
      const { data: term } = await admin.from('terms').insert({
        school_id: schoolId, academic_year_id: yearId, name: td.name, term_number: td.num,
        start_date: td.start, end_date: td.end, is_current: td.num === 1,
      }).select().single();
      if (term) termIds[td.name] = term.id;
    }
  }
  console.log(`✅ ${Object.keys(termIds).length} trimestres`);

  // 3. Classes (6 classes: 6e → Tle)
  console.log('\n🏫 Création classes...');
  const classDefs = [
    { name: '6ème A', level: '6ème' },
    { name: '5ème A', level: '5ème' },
    { name: '4ème A', level: '4ème' },
    { name: '3ème A', level: '3ème' },
    { name: '2nde A', level: '2nde' },
    { name: 'Terminale A', level: 'Tle' },
  ];
  const classMap: Record<string, string> = {};
  for (const cd of classDefs) {
    const { data: existingCls } = await admin.from('classes').select('id').eq('school_id', schoolId).eq('name', cd.name).single();
    if (existingCls) {
      classMap[cd.name] = existingCls.id;
    } else {
      const { data: cls } = await admin.from('classes').insert({
        school_id: schoolId, academic_year_id: yearId, name: cd.name, level: cd.level, capacity: 40,
      }).select().single();
      if (cls) classMap[cd.name] = cls.id;
    }
  }
  console.log(`✅ ${Object.keys(classMap).length} classes`);

  // 4. Subjects (8 matières)
  console.log('\n📚 Création matières...');
  const subjectDefs = [
    { name: 'Mathématiques', code: 'MATH', coeff: 5 },
    { name: 'Français', code: 'FR', coeff: 4 },
    { name: 'Anglais', code: 'ANG', coeff: 3 },
    { name: 'Physique-Chimie', code: 'PC', coeff: 4 },
    { name: 'SVT', code: 'SVT', coeff: 3 },
    { name: 'Histoire-Géo', code: 'HG', coeff: 3 },
    { name: 'EPS', code: 'EPS', coeff: 1 },
    { name: 'Informatique', code: 'INFO', coeff: 2 },
  ];
  const subjectMap: Record<string, string> = {};
  for (const sd of subjectDefs) {
    const { data: existingSubj } = await admin.from('subjects').select('id').eq('school_id', schoolId).eq('code', sd.code).single();
    if (existingSubj) {
      subjectMap[sd.name] = existingSubj.id;
    } else {
      const { data: subj } = await admin.from('subjects').insert({
        school_id: schoolId, name: sd.name, code: sd.code, coefficient: sd.coeff,
      }).select().single();
      if (subj) subjectMap[sd.name] = subj.id;
    }
  }
  console.log(`✅ ${Object.keys(subjectMap).length} matières`);

  // 5. Teachers
  console.log('\n👨‍🏫 Création enseignants...');
  const teacherDefs = [
    { fn: 'Michel', ln: 'Kouassi', email: 'm.kouassi@demo.ecole', spec: 'Mathématiques' },
    { fn: 'Fatoumata', ln: 'Diallo', email: 'f.diallo@demo.ecole', spec: 'Français' },
    { fn: 'Koffi', ln: 'Amenan', email: 'k.amenan@demo.ecole', spec: 'Physique-Chimie' },
    { fn: 'Aïcha', ln: 'Traoré', email: 'a.traore@demo.ecole', spec: 'Anglais' },
  ];
  const teacherIds: string[] = [];
  const teacherByEmail: Record<string, string> = {};
  for (const td of teacherDefs) {
    const { data: existingU } = await admin.from('users').select('id').eq('email', td.email).single();
    let userId: string;
    if (existingU) {
      userId = existingU.id;
    } else {
      const { data: au, error: ae } = await admin.auth.admin.createUser({
        email: td.email, password: DEFAULT_PASSWORD, email_confirm: true,
        user_metadata: { first_name: td.fn, last_name: td.ln, role: 'teacher' },
      });
      if (ae) { console.error(`   ${td.email}: ${ae.message}`); continue; }
      userId = au!.user.id;
      await admin.from('users').insert({
        id: userId, school_id: schoolId, email: td.email,
        role: 'teacher', first_name: td.fn, last_name: td.ln,
      });
    }
    const { data: existingT } = await admin.from('teachers').select('id').eq('user_id', userId).single();
    if (existingT) {
      teacherIds.push(existingT.id);
      teacherByEmail[td.email] = existingT.id;
    } else {
      const { data: t } = await admin.from('teachers').insert({
        user_id: userId, school_id: schoolId, specialization: td.spec, hire_date: '2024-09-01',
      }).select().single();
      if (t) { teacherIds.push(t.id); teacherByEmail[td.email] = t.id; }
    }
    console.log(`   ✅ ${td.fn} ${td.ln} (${td.email} / ${DEFAULT_PASSWORD})`);
  }

  // 6. Students (2 per class = 12)
  console.log('\n👨‍🎓 Création élèves...');
  const studentDefs = [
    { fn: 'Kouamé', ln: 'N\'Guessan', email: 'k.nguessan@demo.ecole', gender: 'M', cls: '6ème A', dob: '2013-03-15' },
    { fn: 'Aminata', ln: 'Koné', email: 'a.kone@demo.ecole', gender: 'F', cls: '6ème A', dob: '2013-07-22' },
    { fn: 'Yao', ln: 'Brou', email: 'y.brou@demo.ecole', gender: 'M', cls: '5ème A', dob: '2012-05-10' },
    { fn: 'Mariam', ln: 'Soro', email: 'm.soro@demo.ecole', gender: 'F', cls: '5ème A', dob: '2012-11-03' },
    { fn: 'Adjoua', ln: 'Ahou', email: 'a.ahou@demo.ecole', gender: 'F', cls: '4ème A', dob: '2011-02-18' },
    { fn: 'Koffi', ln: 'Yao', email: 'koffi.yao@demo.ecole', gender: 'M', cls: '4ème A', dob: '2011-09-25' },
    { fn: 'Béatrice', ln: 'Tano', email: 'b.tano@demo.ecole', gender: 'F', cls: '3ème A', dob: '2010-04-12' },
    { fn: 'Simplice', ln: 'Zadi', email: 's.zadi@demo.ecole', gender: 'M', cls: '3ème A', dob: '2010-08-30' },
    { fn: 'Nadège', ln: 'Bamba', email: 'n.bamba@demo.ecole', gender: 'F', cls: '2nde A', dob: '2009-01-14' },
    { fn: 'Armand', ln: 'Coulibaly', email: 'a.coulibaly@demo.ecole', gender: 'M', cls: '2nde A', dob: '2009-06-07' },
    { fn: 'Estelle', ln: 'Gnahoré', email: 'e.gnahore@demo.ecole', gender: 'F', cls: 'Terminale A', dob: '2007-10-19' },
    { fn: 'David', ln: 'Séka', email: 'd.seka@demo.ecole', gender: 'M', cls: 'Terminale A', dob: '2007-12-01' },
  ];
  const studentMap: Record<string, { id: string; classId: string }> = {};
  let studentIdx = 0;
  for (const sd of studentDefs) {
    const { data: existingU } = await admin.from('users').select('id').eq('email', sd.email).single();
    let userId: string;
    if (existingU) {
      userId = existingU.id;
    } else {
      const { data: au, error: ae } = await admin.auth.admin.createUser({
        email: sd.email, password: DEFAULT_PASSWORD, email_confirm: true,
        user_metadata: { first_name: sd.fn, last_name: sd.ln, role: 'student' },
      });
      if (ae) { console.error(`   ${sd.email}: ${ae.message}`); continue; }
      userId = au!.user.id;
      await admin.from('users').insert({
        id: userId, school_id: schoolId, email: sd.email,
        role: 'student', first_name: sd.fn, last_name: sd.ln,
      });
    }
    const { data: existingSt } = await admin.from('students').select('id').eq('user_id', userId).single();
    if (existingSt) {
      studentMap[sd.email] = { id: existingSt.id, classId: classMap[sd.cls] };
    } else {
      studentIdx++;
      const { data: st } = await admin.from('students').insert({
        user_id: userId, school_id: schoolId,
        matricule: `DEMO-${String(studentIdx).padStart(3, '0')}`,
        class_id: classMap[sd.cls], date_of_birth: sd.dob, gender: sd.gender,
      }).select().single();
      if (st) studentMap[sd.email] = { id: st.id, classId: classMap[sd.cls] };
    }
    console.log(`   ✅ ${sd.fn} ${sd.ln} (${sd.email} / ${DEFAULT_PASSWORD}) → ${sd.cls}`);
  }

  // 7. Parents
  console.log('\n👨‍👩‍👧‍👦 Création parents...');
  const parentDefs = [
    { fn: 'Albert', ln: 'N\'Guessan', email: 'albert.nguessan@demo.ecole', rel: 'Père', studentEmails: ['k.nguessan@demo.ecole'] },
    { fn: 'Marie', ln: 'Koné', email: 'marie.kone@demo.ecole', rel: 'Mère', studentEmails: ['a.kone@demo.ecole'] },
    { fn: 'Thomas', ln: 'Brou', email: 'thomas.brou@demo.ecole', rel: 'Père', studentEmails: ['y.brou@demo.ecole'] },
    { fn: 'Rachel', ln: 'Soro', email: 'rachel.soro@demo.ecole', rel: 'Mère', studentEmails: ['m.soro@demo.ecole'] },
  ];
  for (const pd of parentDefs) {
    const { data: existingU } = await admin.from('users').select('id').eq('email', pd.email).single();
    let userId: string;
    if (existingU) {
      userId = existingU.id;
    } else {
      const { data: au, error: ae } = await admin.auth.admin.createUser({
        email: pd.email, password: DEFAULT_PASSWORD, email_confirm: true,
        user_metadata: { first_name: pd.fn, last_name: pd.ln, role: 'parent' },
      });
      if (ae) { console.error(`   ${pd.email}: ${ae.message}`); continue; }
      userId = au!.user.id;
      await admin.from('users').insert({
        id: userId, school_id: schoolId, email: pd.email,
        role: 'parent', first_name: pd.fn, last_name: pd.ln,
      });
    }
    const { data: existingP } = await admin.from('parents').select('id').eq('user_id', userId).single();
    let parentId: string;
    if (existingP) {
      parentId = existingP.id;
    } else {
      const { data: p } = await admin.from('parents').insert({
        user_id: userId, school_id: schoolId, relationship: pd.rel,
      }).select().single();
      if (!p) continue;
      parentId = p.id;
    }
    for (const se of pd.studentEmails) {
      const st = studentMap[se];
      if (st) {
        const { data: existingLink } = await admin.from('student_parents').select('id').eq('student_id', st.id).eq('parent_id', parentId).single();
        if (!existingLink) {
          await admin.from('student_parents').insert({ student_id: st.id, parent_id: parentId, is_primary: pd.rel === 'Père' });
        }
      }
    }
    console.log(`   ✅ ${pd.fn} ${pd.ln} (${pd.email} / ${DEFAULT_PASSWORD})`);
  }

  // 8. Teacher-subject-class assignments
  console.log('\n🔗 Affectations enseignants...');
  const assignDefs: { teacherEmail: string; subject: string; classes: string[] }[] = [
    { teacherEmail: 'm.kouassi@demo.ecole', subject: 'Mathématiques', classes: ['6ème A', '5ème A', '4ème A', '3ème A', '2nde A', 'Terminale A'] },
    { teacherEmail: 'f.diallo@demo.ecole', subject: 'Français', classes: ['6ème A', '5ème A', '4ème A', '3ème A', '2nde A', 'Terminale A'] },
    { teacherEmail: 'k.amenan@demo.ecole', subject: 'Physique-Chimie', classes: ['4ème A', '3ème A', '2nde A', 'Terminale A'] },
    { teacherEmail: 'a.traore@demo.ecole', subject: 'Anglais', classes: ['6ème A', '5ème A', '2nde A', 'Terminale A'] },
  ];
  let assignCount = 0;
  for (const ad of assignDefs) {
    const tId = teacherByEmail[ad.teacherEmail];
    const subjId = subjectMap[ad.subject];
    if (!tId || !subjId) continue;
    for (const cn of ad.classes) {
      const cId = classMap[cn];
      if (!cId) continue;
      const { data: existingA } = await admin.from('teacher_subjects').select('id')
        .eq('teacher_id', tId).eq('subject_id', subjId).eq('class_id', cId).single();
      if (!existingA) {
        const { error: ie } = await admin.from('teacher_subjects').insert({
          teacher_id: tId, subject_id: subjId, class_id: cId, school_id: schoolId,
        });
        if (!ie) assignCount++;
      }
    }
  }
  console.log(`✅ ${assignCount} affectations`);

  // 9. Grades — full year simulation
  console.log('\n📝 Génération des notes (année complète)...');
  let gradeCount = 0;
  const gradeTypes = ['Devoir', 'Interro', 'Composition'] as const;

  for (const [tName, termId] of Object.entries(termIds)) {
    console.log(`   ${tName}...`);
    for (const [studentEmail, st] of Object.entries(studentMap)) {
      // Find which subjects are assigned to this student's class
      for (const [subjName, subjId] of Object.entries(subjectMap)) {
        // Check if this subject is taught in the student's class
        const isAssigned = assignDefs.some(ad =>
          ad.classes.includes(Object.entries(classMap).find(([k, v]) => v === st.classId)?.[0] ?? '') &&
          ad.subject === subjName
        );
        if (!isAssigned) continue;

        // Create grades with realistic random scores (scale 0-20)
        const score = rand(6, 18);
        const { data: existingGrade } = await admin.from('grades').select('id')
          .eq('student_id', st.id).eq('subject_id', subjId).eq('term_id', termId)
          .eq('grade_type', 'Composition').single();
        if (!existingGrade) {
          await admin.from('grades').insert({
            student_id: st.id, subject_id: subjId, term_id: termId,
            school_id: schoolId, grade_type: 'Composition',
            score, max_score: 20,
            date: pick(['2025-10-15', '2025-11-20', '2026-03-10', '2026-05-25']),
          });
          gradeCount++;
        }

        const interroScore = rand(8, 19);
        const { data: existingInterro } = await admin.from('grades').select('id')
          .eq('student_id', st.id).eq('subject_id', subjId).eq('term_id', termId)
          .eq('grade_type', 'Interro').single();
        if (!existingInterro) {
          await admin.from('grades').insert({
            student_id: st.id, subject_id: subjId, term_id: termId,
            school_id: schoolId, grade_type: 'Interro',
            score: interroScore, max_score: 20,
            date: pick(['2025-10-05', '2025-11-10', '2026-02-20', '2026-05-10']),
          });
          gradeCount++;
        }

        if (subjName !== 'EPS') {
          const devoirScore = rand(5, 17);
          const { data: existingDevoir } = await admin.from('grades').select('id')
            .eq('student_id', st.id).eq('subject_id', subjId).eq('term_id', termId)
            .eq('grade_type', 'Devoir').single();
          if (!existingDevoir) {
            await admin.from('grades').insert({
              student_id: st.id, subject_id: subjId, term_id: termId,
              school_id: schoolId, grade_type: 'Devoir',
              score: devoirScore, max_score: 20,
              date: pick(['2025-09-25', '2025-12-05', '2026-01-25', '2026-04-20']),
            });
            gradeCount++;
          }
        }
      }
    }
  }
  console.log(`✅ ${gradeCount} notes créées`);

  // 10. Attendance
  console.log('\n📋 Génération présences...');
  const statuses = ['present', 'present', 'present', 'present', 'present', 'present', 'present', 'absent', 'late', 'excused'] as const;
  let attendanceCount = 0;
  for (const st of Object.values(studentMap)) {
    const classStudents = Object.values(studentMap).filter(s => s.classId === st.classId);
    if (classStudents.length === 0) continue;
    // Generate attendance for a few dates
    for (const dateStr of ['2025-09-15', '2025-10-01', '2025-10-20', '2025-11-05', '2025-11-25', '2025-12-10',
                            '2026-01-10', '2026-01-25', '2026-02-15', '2026-03-01', '2026-03-20',
                            '2026-04-15', '2026-05-05', '2026-05-25', '2026-06-10']) {
      const { data: existingA } = await admin.from('attendance').select('id')
        .eq('student_id', st.id).eq('date', dateStr).single();
      if (!existingA) {
        await admin.from('attendance').insert({
          student_id: st.id, class_id: st.classId, school_id: schoolId,
          date: dateStr, status: pick(statuses),
        });
        attendanceCount++;
      }
    }
  }
  console.log(`✅ ${attendanceCount} présences`);

  // 11. Tuition fees
  console.log('\n💰 Frais de scolarité...');
  const feeAmounts: Record<string, number> = {
    '6ème A': 300000, '5ème A': 300000, '4ème A': 350000,
    '3ème A': 350000, '2nde A': 400000, 'Terminale A': 450000,
  };
  for (const [cn, amount] of Object.entries(feeAmounts)) {
    const cId = classMap[cn];
    if (!cId) continue;
    const { data: existingFee } = await admin.from('tuition_fees').select('id')
      .eq('school_id', schoolId).eq('class_id', cId).single();
    if (!existingFee) {
      await admin.from('tuition_fees').insert({
        school_id: schoolId, class_id: cId, academic_year_id: yearId,
        amount, description: `Frais ${cn} - 2025-2026`,
      });
    }
  }
  console.log('✅ Frais configurés');

  // ===== SUMMARY =====
  console.log('\n═══════════════════════════════════════');
  console.log(`  🎉 SIMULATION TERMINÉE`);
  console.log(`  ${SCHOOL_NAME}`);
  console.log(`  ${baseUrl}`);
  console.log('═══════════════════════════════════════\n');
  console.log('📊 STATISTIQUES');
  console.log(`   Classes:      ${Object.keys(classMap).length}`);
  console.log(`   Matières:     ${Object.keys(subjectMap).length}`);
  console.log(`   Enseignants:  ${teacherIds.length}`);
  console.log(`   Élèves:       ${Object.keys(studentMap).length}`);
  console.log(`   Notes:        ${gradeCount}`);
  console.log(`   Présences:    ${attendanceCount}`);
  console.log(`   Affectations: ${assignCount}\n`);

  console.log('📋 IDENTIFIANTS DE CONNEXION');
  console.log('─────────────────────────────────────\n');
  console.log(`🔑 Mot de passe général: ${DEFAULT_PASSWORD}\n`);
  console.log(`👑 ADMIN`);
  console.log(`   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
  console.log(`👨‍🏫 ENSEIGNANTS`);
  for (const td of teacherDefs) {
    console.log(`   ${td.fn} ${td.ln}: ${td.email} / ${DEFAULT_PASSWORD}`);
  }
  console.log(`\n👨‍🎓 ÉLÈVES`);
  for (const sd of studentDefs) {
    console.log(`   ${sd.fn} ${sd.ln}: ${sd.email} / ${DEFAULT_PASSWORD}`);
  }
  console.log(`\n👨‍👩‍👧‍👦 PARENTS`);
  for (const pd of parentDefs) {
    console.log(`   ${pd.fn} ${pd.ln}: ${pd.email} / ${DEFAULT_PASSWORD}`);
  }
  console.log(`\n🌐 URL: ${baseUrl}\n`);
  console.log('✅ Simulation terminée avec succès !');
}

main().catch(console.error);
