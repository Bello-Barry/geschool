import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const getEnv = (key: string): string | undefined => {
  const m = envContent.match(new RegExp(`${key}=(.+)`));
  return m?.[1]?.trim();
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')!;
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SCHOOL_SUBDOMAIN = 'lycee-sassou';

async function main() {
  console.log('🔍 Finding school...');
  const { data: school } = await admin.from('schools').select('*').eq('subdomain', SCHOOL_SUBDOMAIN).single();
  if (!school) { console.error('School not found!'); return; }
  const schoolId = school.id;
  console.log(`✅ School: ${school.name} (${schoolId})`);

  // 1. Academic Year (idempotent)
  console.log('\n📅 Creating academic year...');
  let { data: year } = await admin.from('academic_years')
    .select('*')
    .eq('school_id', schoolId)
    .eq('name', '2025-2026')
    .maybeSingle();
  if (!year) {
    const { data: newYear } = await admin.from('academic_years').insert({
      school_id: schoolId,
      name: '2025-2026',
      start_date: '2025-09-01',
      end_date: '2026-07-31',
      is_current: true,
    }).select().single();
    if (!newYear) { console.error('Failed to create academic year'); return; }
    year = newYear;
    console.log(`   ✅ Created new year`);
  } else {
    console.log(`   ⏭️  Already exists`);
  }
  const yearId = year.id;
  console.log(`   Year: ${year.name} (${yearId})`);

  // 2. Terms (idempotent)
  console.log('\n📆 Creating terms...');
  const termsData = [
    { name: '1er Trimestre', term_number: 1, start_date: '2025-09-01', end_date: '2025-12-20', is_current: true },
    { name: '2ème Trimestre', term_number: 2, start_date: '2026-01-05', end_date: '2026-04-04', is_current: false },
    { name: '3ème Trimestre', term_number: 3, start_date: '2026-04-13', end_date: '2026-07-31', is_current: false },
  ];
  const termIds: Record<string, string> = {};
  for (const t of termsData) {
    let { data: term } = await admin.from('terms')
      .select('id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', yearId)
      .eq('name', t.name)
      .maybeSingle();
    if (!term) {
      const { data: newTerm } = await admin.from('terms').insert({
        school_id: schoolId, academic_year_id: yearId, ...t,
      }).select().single();
      term = newTerm || undefined;
    }
    if (term) termIds[t.name] = term.id;
  }
  console.log(`   ${Object.keys(termIds).length} terms accounted for`);

  // 3. Classes (idempotent)
  console.log('\n🏫 Creating classes...');
  const classData = [
    { name: '6ème A', level: '6ème' },
    { name: '6ème B', level: '6ème' },
    { name: '5ème A', level: '5ème' },
    { name: '5ème B', level: '5ème' },
    { name: '4ème A', level: '4ème' },
    { name: '3ème A', level: '3ème' },
    { name: '2nde A', level: '2nde A' },
    { name: '2nde C', level: '2nde C' },
    { name: '1ère A', level: '1ère A' },
    { name: '1ère C', level: '1ère C' },
    { name: 'Tle A', level: 'Terminale A' },
    { name: 'Tle C', level: 'Terminale C' },
  ];
  const classMap: Record<string, string> = {};
  for (const c of classData) {
    let { data: cls } = await admin.from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', yearId)
      .eq('name', c.name)
      .maybeSingle();
    if (!cls) {
      const { data: newCls } = await admin.from('classes').insert({
        school_id: schoolId, academic_year_id: yearId, name: c.name, level: c.level, capacity: 45,
      }).select().single();
      cls = newCls || undefined;
    }
    if (cls) classMap[c.name] = cls.id;
  }
  console.log(`   ${Object.keys(classMap).length} classes accounted for`);

  // 4. Subjects (idempotent)
  console.log('\n📚 Creating subjects...');
  const subjectData = [
    { name: 'Mathématiques', code: 'MATH', coefficient: 5 },
    { name: 'Français', code: 'FR', coefficient: 4 },
    { name: 'Anglais', code: 'ANG', coefficient: 3 },
    { name: 'Physique-Chimie', code: 'PC', coefficient: 4 },
    { name: 'SVT', code: 'SVT', coefficient: 3 },
    { name: 'Histoire-Géographie', code: 'HG', coefficient: 3 },
    { name: 'Philosophie', code: 'PHILO', coefficient: 3 },
    { name: 'EPS', code: 'EPS', coefficient: 1 },
    { name: 'Espagnol', code: 'ESP', coefficient: 2 },
    { name: 'Allemand', code: 'ALL', coefficient: 2 },
    { name: 'Informatique', code: 'INFO', coefficient: 2 },
    { name: 'Comptabilité', code: 'COMPTA', coefficient: 3 },
  ];
  const subjectMap: Record<string, string> = {};
  for (const s of subjectData) {
    let { data: subj } = await admin.from('subjects')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', s.name)
      .maybeSingle();
    if (!subj) {
      const { data: newSubj } = await admin.from('subjects').insert({
        school_id: schoolId, ...s,
      }).select().single();
      subj = newSubj || undefined;
    }
    if (subj) subjectMap[s.name] = subj.id;
  }
  console.log(`   ${Object.keys(subjectMap).length} subjects accounted for`);

  // 5. Teachers (create auth users + profiles)
  console.log('\n👨‍🏫 Creating teachers...');
  const teachers = [
    { first_name: 'Jean', last_name: 'Mbokani', email: 'jean.mbokani@lycee-sassou.cd', specialization: 'Mathématiques' },
    { first_name: 'Marie', last_name: 'Nzuzi', email: 'marie.nzuzi@lycee-sassou.cd', specialization: 'Français' },
    { first_name: 'Paul', last_name: 'Bakala', email: 'paul.bakala@lycee-sassou.cd', specialization: 'Physique-Chimie' },
    { first_name: 'Alice', last_name: 'Mputu', email: 'alice.mputu@lycee-sassou.cd', specialization: 'Anglais' },
    { first_name: 'Joseph', last_name: 'Kabila', email: 'joseph.kabila@lycee-sassou.cd', specialization: 'Histoire-Géographie' },
    { first_name: 'Béatrice', last_name: 'Lumumba', email: 'beatrice.lumumba@lycee-sassou.cd', specialization: 'SVT' },
  ];
  const teacherIds: string[] = [];
  for (const t of teachers) {
    const pw = 'password123';
    const { data: authUser, error: ae } = await admin.auth.admin.createUser({
      email: t.email, password: pw, email_confirm: true,
      user_metadata: { first_name: t.first_name, last_name: t.last_name, role: 'teacher' },
    });
    if (ae) { console.error(`   Failed to create auth user for ${t.email}: ${ae.message}`); continue; }
    const { error: ue } = await admin.from('users').insert({
      id: authUser!.user.id, school_id: schoolId, email: t.email,
      role: 'teacher', first_name: t.first_name, last_name: t.last_name,
    });
    if (ue) { console.error(`   Failed to create user for ${t.email}: ${ue.message}`); await admin.auth.admin.deleteUser(authUser!.user.id); continue; }
    const { data: teacher } = await admin.from('teachers').insert({
      user_id: authUser!.user.id, school_id: schoolId, specialization: t.specialization, hire_date: '2024-09-01',
    }).select().single();
    if (teacher) { teacherIds.push(teacher.id); console.log(`   ✅ ${t.first_name} ${t.last_name} (${t.email} / ${pw})`); }
  }
  console.log(`   ${teacherIds.length} teachers created`);

  // 6. Students (auth users + profiles)
  console.log('\n👨‍🎓 Creating students...');
  const students = [
    { fn: 'Alain', ln: 'Mabiala', email: 'alain.mabiala@etudiant.cd', gender: 'M', cls: '6ème A', dob: '2013-03-15' },
    { fn: 'Chantal', ln: 'Nkosi', email: 'chantal.nkosi@etudiant.cd', gender: 'F', cls: '6ème A', dob: '2014-01-20' },
    { fn: 'Dieudonné', ln: 'Lopès', email: 'dieudonne.lopes@etudiant.cd', gender: 'M', cls: '5ème A', dob: '2013-06-10' },
    { fn: 'Esther', ln: 'Boungou', email: 'esther.boungou@etudiant.cd', gender: 'F', cls: '5ème A', dob: '2012-11-05' },
    { fn: 'Félix', ln: 'Tshisekedi', email: 'felix.tshisekedi@etudiant.cd', gender: 'M', cls: '4ème A', dob: '2012-02-28' },
    { fn: 'Grace', ln: 'Kinkela', email: 'grace.kinkela@etudiant.cd', gender: 'F', cls: '3ème A', dob: '2011-07-14' },
    { fn: 'Hervé', ln: 'Matingou', email: 'herve.matingou@etudiant.cd', gender: 'M', cls: '2nde A', dob: '2010-09-01' },
    { fn: 'Irene', ln: 'Mavoungou', email: 'irene.mavoungou@etudiant.cd', gender: 'F', cls: '2nde C', dob: '2009-12-22' },
    { fn: 'Justin', ln: 'Makosso', email: 'justin.makosso@etudiant.cd', gender: 'M', cls: '1ère A', dob: '2008-05-30' },
    { fn: 'Karine', ln: 'Biyoko', email: 'karine.biyoko@etudiant.cd', gender: 'F', cls: '1ère C', dob: '2008-08-18' },
    { fn: 'Landry', ln: 'Poaty', email: 'landry.poaty@etudiant.cd', gender: 'M', cls: 'Tle A', dob: '2007-03-02' },
    { fn: 'Mireille', ln: 'Koumbou', email: 'mireille.koumbou@etudiant.cd', gender: 'F', cls: 'Tle C', dob: '2006-10-11' },
  ];
  const studentMap: Record<string, string> = {};
  for (const s of students) {
    const pw = 'password123';
    const { data: authUser, error: ae } = await admin.auth.admin.createUser({
      email: s.email, password: pw, email_confirm: true,
      user_metadata: { first_name: s.fn, last_name: s.ln, role: 'student' },
    });
    if (ae) { console.error(`   Failed auth for ${s.email}: ${ae.message}`); continue; }
    const { error: ue } = await admin.from('users').insert({
      id: authUser!.user.id, school_id: schoolId, email: s.email,
      role: 'student', first_name: s.fn, last_name: s.ln,
    });
    if (ue) { console.error(`   Failed user for ${s.email}: ${ue.message}`); await admin.auth.admin.deleteUser(authUser!.user.id); continue; }
    const { data: student } = await admin.from('students').insert({
      user_id: authUser!.user.id, school_id: schoolId,
      matricule: `LYC-${String(Object.keys(studentMap).length + 1).padStart(4, '0')}`,
      class_id: classMap[s.cls], date_of_birth: s.dob, gender: s.gender,
    }).select().single();
    if (student) { studentMap[s.email] = student.id; console.log(`   ✅ ${s.fn} ${s.ln} (${s.email} / ${pw}) → ${s.cls}`); }
  }
  console.log(`   ${Object.keys(studentMap).length} students created`);

  // 7. Parents
  console.log('\n👨‍👩‍👧‍👦 Creating parents...');
  const parents = [
    { fn: 'Antoine', ln: 'Mabiala', email: 'antoine.mabiala@parent.cd', rel: 'Père', studentEmail: 'alain.mabiala@etudiant.cd' },
    { fn: 'Sophie', ln: 'Mabiala', email: 'sophie.mabiala@parent.cd', rel: 'Mère', studentEmail: 'alain.mabiala@etudiant.cd' },
    { fn: 'Robert', ln: 'Nkosi', email: 'robert.nkosi@parent.cd', rel: 'Père', studentEmail: 'chantal.nkosi@etudiant.cd' },
    { fn: 'Michel', ln: 'Lopès', email: 'michel.lopes@parent.cd', rel: 'Père', studentEmail: 'dieudonne.lopes@etudiant.cd' },
    { fn: 'Pierre', ln: 'Tshisekedi', email: 'pierre.tshisekedi@parent.cd', rel: 'Père', studentEmail: 'felix.tshisekedi@etudiant.cd' },
    { fn: 'Catherine', ln: 'Makosso', email: 'catherine.makosso@parent.cd', rel: 'Mère', studentEmail: 'justin.makosso@etudiant.cd' },
  ];
  let parentCount = 0;
  for (const p of parents) {
    const pw = 'password123';
    const { data: authUser, error: ae } = await admin.auth.admin.createUser({
      email: p.email, password: pw, email_confirm: true,
      user_metadata: { first_name: p.fn, last_name: p.ln, role: 'parent' },
    });
    if (ae) { console.error(`   Failed auth for ${p.email}: ${ae.message}`); continue; }
    const { error: ue } = await admin.from('users').insert({
      id: authUser!.user.id, school_id: schoolId, email: p.email,
      role: 'parent', first_name: p.fn, last_name: p.ln,
    });
    if (ue) { console.error(`   Failed user for ${p.email}: ${ue.message}`); await admin.auth.admin.deleteUser(authUser!.user.id); continue; }
    const { data: parent } = await admin.from('parents').insert({
      user_id: authUser!.user.id, school_id: schoolId, relationship: p.rel,
    }).select().single();
    if (parent) {
      const studentId = studentMap[p.studentEmail];
      if (studentId) {
        await admin.from('student_parents').insert({ student_id: studentId, parent_id: parent.id, is_primary: p.rel === 'Père' });
      }
      parentCount++;
      console.log(`   ✅ ${p.fn} ${p.ln} (${p.email} / ${pw}) → parent de ${p.studentEmail}`);
    }
  }
  console.log(`   ${parentCount} parents created`);

  // 8. Teacher-class-subject assignments (idempotent)
  console.log('\n🔗 Creating assignments...');
  const assignments = [
    { teacherEmail: 'jean.mbokani@lycee-sassou.cd', subject: 'Mathématiques', classes: ['6ème A', '6ème B', '5ème A', '2nde A', '2nde C', '1ère C', 'Tle C'] },
    { teacherEmail: 'marie.nzuzi@lycee-sassou.cd', subject: 'Français', classes: ['6ème A', '5ème A', '4ème A', '3ème A', '2nde A', '1ère A', 'Tle A'] },
    { teacherEmail: 'paul.bakala@lycee-sassou.cd', subject: 'Physique-Chimie', classes: ['4ème A', '3ème A', '2nde C', '1ère C', 'Tle C'] },
    { teacherEmail: 'alice.mputu@lycee-sassou.cd', subject: 'Anglais', classes: ['6ème A', '5ème A', '4ème A', '2nde A', '1ère A', 'Tle A'] },
    { teacherEmail: 'joseph.kabila@lycee-sassou.cd', subject: 'Histoire-Géographie', classes: ['5ème A', '4ème A', '3ème A', '2nde A', '1ère A', 'Tle A'] },
    { teacherEmail: 'beatrice.lumumba@lycee-sassou.cd', subject: 'SVT', classes: ['5ème A', '4ème A', '2nde C', '1ère C'] },
  ];
  let assignmentCount = 0;
  for (const a of assignments) {
    const subjectId = subjectMap[a.subject];
    if (!subjectId) continue;
    const { data: user } = await admin.from('users').select('id').eq('email', a.teacherEmail).single();
    if (!user) { console.error(`   User not found: ${a.teacherEmail}`); continue; }
    const { data: teacher } = await admin.from('teachers').select('id').eq('user_id', user.id).single();
    if (!teacher) { console.error(`   Teacher profile not found: ${a.teacherEmail}`); continue; }
    for (const className of a.classes) {
      const classId = classMap[className];
      if (!classId) continue;
      const { data: existing } = await admin.from('teacher_subjects')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('subject_id', subjectId)
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .maybeSingle();
      if (!existing) {
        const { error: insErr } = await admin.from('teacher_subjects').insert({
          teacher_id: teacher.id, subject_id: subjectId, class_id: classId, school_id: schoolId,
        });
        if (!insErr) assignmentCount++;
      } else {
        assignmentCount++;
      }
    }
  }
  console.log(`   ${assignmentCount} assignments accounted for`);

  // 9. Tuition fees (idempotent)
  console.log('\n💰 Creating tuition fees...');
  for (const [clsName, amount] of Object.entries({
    '6ème A': 350000, '6ème B': 350000,
    '5ème A': 350000, '5ème B': 350000,
    '4ème A': 400000,
    '3ème A': 400000,
    '2nde A': 500000, '2nde C': 550000,
    '1ère A': 500000, '1ère C': 550000,
    'Tle A': 500000, 'Tle C': 550000,
  })) {
    const classId = classMap[clsName];
    if (!classId) continue;
    const { data: existing } = await admin.from('tuition_fees')
      .select('id')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('academic_year_id', yearId)
      .maybeSingle();
    if (!existing) {
      await admin.from('tuition_fees').insert({
        school_id: schoolId, class_id: classId, academic_year_id: yearId,
        amount, description: `Frais de scolarité ${clsName} - Année 2025-2026`,
      });
    }
  }
  console.log(`   Tuition fees set for all classes`);

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('🎉 ÉCOLE LYÉE DENIS SASSOU NGUESSO');
  console.log('═══════════════════════════════════════');
  console.log(`📅 Année scolaire: 2025-2026`);
  console.log(`🏫 Classes: ${Object.keys(classMap).length}`);
  console.log(`📚 Matières: ${Object.keys(subjectMap).length}`);
  console.log(`👨‍🏫 Enseignants: ${teacherIds.length}`);
  console.log(`👨‍🎓 Élèves: ${Object.keys(studentMap).length}`);
  console.log(`👨‍👩‍👧‍👦 Parents: ${parentCount}`);
  console.log(`🔗 Affectations: ${assignmentCount}`);
  console.log('\n📋 IDENTIFIANTS DE CONNEXION:');
  console.log('─────────────────────────────────────');
  console.log('Admin: barry2@geschool.com / password123');
  console.log('Enseignants:');
  for (const t of teachers) console.log(`   ${t.first_name} ${t.last_name}: ${t.email} / password123`);
  console.log('Élèves:');
  for (const s of students) console.log(`   ${s.fn} ${s.ln}: ${s.email} / password123`);
  console.log('Parents:');
  for (const p of parents) console.log(`   ${p.fn} ${p.ln}: ${p.email} / password123`);
  console.log('\n✅ Création terminée !');
}

main().catch(console.error);
