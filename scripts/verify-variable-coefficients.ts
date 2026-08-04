/**
 * Vérification réelle des coefficients variables par (matière, classe).
 *
 * Prérequis :
 *  - migration 20260804000000_variable_coefficients.sql appliquée sur la base
 *  - .env.local avec NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Lancement : npx tsx scripts/verify-variable-coefficients.ts
 *
 * Scénario :
 *  - Deux classes de séries différentes : Tle C et Tle A
 *  - Mathématiques : coeff 5 en Tle C, coeff 2 en Tle A (même matière, même prof)
 *  - Français : coeff 3 en Tle C, coeff 4 en Tle A
 *  - Histoire (retro-compat) : affectée en Tle A SANS coefficient explicite
 *  - Élève en Tle C et élève en Tle A avec les MÊMES notes brutes (maths 15, français 12)
 *    → les moyennes générales doivent différer (pondération selon la série)
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key);

const rand = Math.random().toString(36).slice(2, 8);
const subdomain = `vcoeff-${rand}`;

let failures = 0;
function check(label: string, actual: number | null | undefined, expected: number) {
  const a = Number(actual);
  const pass = Math.abs(a - expected) < 1e-6;
  console.log(`${pass ? "✅" : "❌"} ${label} → attendu ${expected}, obtenu ${a}`);
  if (!pass) failures++;
}

async function main() {
  console.log(`\n=== Vérification coefficients par classe (école ${subdomain}) ===\n`);

  // 1. École + année + trimestre
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: `Verify Coeff ${rand}`, subdomain, code: `VC${rand}` })
    .select("id")
    .single();
  if (schoolErr || !school) throw new Error(`school: ${schoolErr?.message}`);

  const { data: ay } = await admin
    .from("academic_years")
    .insert({ school_id: school.id, name: "2025-2026", start_date: "2025-09-01", end_date: "2026-07-31", is_current: true })
    .select("id")
    .single();
  if (!ay) throw new Error("academic year");

  const { data: term } = await admin
    .from("terms")
    .insert({ school_id: school.id, academic_year_id: ay.id, name: "Trimestre 1", term_number: 1, start_date: "2025-09-15", end_date: "2026-01-15", is_current: true })
    .select("id")
    .single();
  if (!term) throw new Error("term");

  // 2. Classes (séries)
  const mkClass = async (name: string) => {
    const { data: c } = await admin
      .from("classes")
      .insert({ school_id: school.id, academic_year_id: ay.id, name, level: "Terminale" })
      .select("id")
      .single();
    if (!c) throw new Error(`class ${name}`);
    return c.id;
  };
  const tleC = await mkClass("Tle C");
  const tleA = await mkClass("Tle A");

  // 3. Matières (coefficient générique = défaut de repli)
  const mkSubject = async (name: string, coefficient: number) => {
    const { data: s } = await admin
      .from("subjects")
      .insert({ school_id: school.id, name, code: name.toUpperCase(), coefficient })
      .select("id")
      .single();
    if (!s) throw new Error(`subject ${name}`);
    return s.id;
  };
  const maths = await mkSubject("Mathématiques", 4);
  const francais = await mkSubject("Français", 3);
  const histoire = await mkSubject("Histoire", 2);

  // 4. Professeurs
  const mkTeacher = async (firstName: string) => {
    const { data: t } = await admin
      .from("teachers")
      .insert({ school_id: school.id, specialization: firstName })
      .select("id")
      .single();
    if (!t) throw new Error(`teacher ${firstName}`);
    return t.id;
  };
  const profMaths = await mkTeacher("MATH");
  const profFrancais = await mkTeacher("FR");

  // 5. Affectations avec coefficient par classe
  const assign = async (teacher_id: string, subject_id: string, class_id: string, coefficient: number | null) => {
    const { error } = await admin
      .from("teacher_subjects")
      .insert({ teacher_id, subject_id, class_id, school_id: school.id, coefficient });
    if (error) throw new Error(`assign: ${error.message}`);
  };
  await assign(profMaths, maths, tleC, 5);
  await assign(profMaths, maths, tleA, 2);
  await assign(profFrancais, francais, tleC, 3);
  await assign(profFrancais, francais, tleA, 4);
  // Rétrocompatibilité : Histoire en Tle A SANS coefficient explicite → repli sur subjects.coefficient (2)
  await assign(profMaths, histoire, tleA, null);

  // 6. Élèves
  const mkStudent = async (matricule: string, class_id: string) => {
    const { data: s } = await admin
      .from("students")
      .insert({ school_id: school.id, class_id, matricule })
      .select("id")
      .single();
    if (!s) throw new Error(`student ${matricule}`);
    return s.id;
  };
  const studentC = await mkStudent(`VCC-${rand}`, tleC);
  const studentA = await mkStudent(`VCA-${rand}`, tleA);

  // 7. Notes : MÊMES notes brutes pour les deux élèves
  const addGrade = async (student_id: string, subject_id: string, score: number) => {
    const { error } = await admin
      .from("grades")
      .insert({ student_id, subject_id, term_id: term.id, school_id: school.id, grade_type: "exam", score, max_score: 20, date: "2025-12-01" });
    if (error) throw new Error(`grade: ${error.message}`);
  };
  await addGrade(studentC, maths, 15);
  await addGrade(studentC, francais, 12);
  await addGrade(studentA, maths, 15);
  await addGrade(studentA, francais, 12);
  // L'élève de Tle A a en plus Histoire (retro-compat, coeff générique 2)
  await addGrade(studentA, histoire, 10);

  // 8. Moyennes générales → doivent différer selon la série
  const { data: avgC } = await admin.rpc("calculate_general_average", { p_student_id: studentC, p_term_id: term.id });
  const { data: avgA } = await admin.rpc("calculate_general_average", { p_student_id: studentA, p_term_id: term.id });

  // (7.5×5 + 6×3) / 8 = 6.9375 → 6.94
  check("Moyenne générale élève Tle C (maths coeff 5)", avgC, 6.94);
  // (7.5×2 + 6×4 + 5×2) / 8 = 6.125 → 6.13
  check("Moyenne générale élève Tle A (maths coeff 2)", avgA, 6.13);

  if (Number(avgC) === Number(avgA)) {
    console.log("❌ Les deux moyennes sont identiques alors qu'elles devraient différer.");
    failures++;
  } else {
    console.log("✅ Les moyennes générales diffèrent selon la série pour les mêmes notes brutes.");
  }

  // 9. Coefficient réel lu par la base (fonction get_subject_coefficient)
  const { data: cMathsC } = await admin.rpc("get_subject_coefficient", { p_student_id: studentC, p_subject_id: maths });
  const { data: cMathsA } = await admin.rpc("get_subject_coefficient", { p_student_id: studentA, p_subject_id: maths });
  const { data: cFrancaisA } = await admin.rpc("get_subject_coefficient", { p_student_id: studentA, p_subject_id: francais });
  const { data: cHistoireA } = await admin.rpc("get_subject_coefficient", { p_student_id: studentA, p_subject_id: histoire });

  check("get_subject_coefficient(Tle C, Maths)", cMathsC, 5);
  check("get_subject_coefficient(Tle A, Maths)", cMathsA, 2);
  check("get_subject_coefficient(Tle A, Français)", cFrancaisA, 4);
  check("get_subject_coefficient(Tle A, Histoire) — rétrocompat, repli subjects.coefficient", cHistoireA, 2);

  // 10. Vérifier que le repli vaut bien subjects.coefficient (4) quand aucune affectation
  const { data: cMathsNoAssign } = await admin.rpc("get_subject_coefficient", { p_student_id: studentC, p_subject_id: histoire });
  check("get_subject_coefficient(Tle C, Histoire) — pas d'affectation → repli 2", cMathsNoAssign, 2);

  // Nettoyage best-effort
  for (const id of [studentC, studentA]) await admin.from("grades").delete().eq("student_id", id);
  for (const id of [studentC, studentA]) await admin.from("students").delete().eq("id", id);
  await admin.from("teacher_subjects").delete().eq("school_id", school.id);
  await admin.from("teachers").delete().eq("school_id", school.id);
  await admin.from("subjects").delete().eq("school_id", school.id);
  await admin.from("classes").delete().eq("school_id", school.id);
  await admin.from("terms").delete().eq("school_id", school.id);
  await admin.from("academic_years").delete().eq("school_id", school.id);
  await admin.from("schools").delete().eq("id", school.id);

  console.log(`\n${failures === 0 ? "✅ TOUS LES TESTS PASSENT" : `❌ ${failures} TEST(S) EN ÉCHEC`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
