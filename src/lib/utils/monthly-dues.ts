import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Génère (à la demande) l'échéance mensuelle du mois courant pour un élève.
 * - Ne crée jamais d'échéances rétroactives : uniquement pour le mois en cours.
 * - Ne crée pas de doublon : si une échéance existe déjà pour (élève, année,
 *   mois courant), elle est renvoyée telle quelle.
 * - Le montant est copié depuis tuition_fees.amount de la classe de l'élève.
 * - La date limite reprend tuition_fees.due_date si présente, sinon le dernier
 *   jour du mois courant.
 */
export async function ensureMonthlyDueForStudent(studentId: string): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1; // 1-12

  const { data: student } = await supabase
    .from("students")
    .select("id, school_id, class_id")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: currentAY } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", student.school_id)
    .eq("is_current", true)
    .maybeSingle();

  // Pas d'année scolaire en cours -> pas d'échéance générable
  if (!currentAY) return null;

  // Doublon éventuel pour le mois courant
  const { data: existing } = await supabase
    .from("monthly_dues")
    .select("id")
    .eq("student_id", studentId)
    .eq("academic_year_id", currentAY.id)
    .eq("period_year", periodYear)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (existing) return existing;

  // Montant depuis la scolarité de la classe
  const { data: fee } = await supabase
    .from("tuition_fees")
    .select("amount, due_date")
    .eq("school_id", student.school_id)
    .eq("academic_year_id", currentAY.id)
    .eq("class_id", student.class_id)
    .maybeSingle();

  // Pas de tarif configuré -> on ne peut pas chiffrer l'échéance
  if (!fee) return null;

  let dueDate: string;
  if (fee.due_date) {
    dueDate = fee.due_date.split("T")[0];
  } else {
    const lastDay = new Date(periodYear, periodMonth, 0).getDate();
    dueDate = `${periodYear}-${String(periodMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  const { data: created, error } = await supabase
    .from("monthly_dues")
    .insert({
      school_id: student.school_id,
      student_id: student.id,
      class_id: student.class_id,
      academic_year_id: currentAY.id,
      period_year: periodYear,
      period_month: periodMonth,
      amount: fee.amount,
      due_date: dueDate,
      status: "unpaid",
    })
    .select("id")
    .single();

  if (error) return null;
  return created;
}

/**
 * Garantit l'échéance du mois courant pour plusieurs élèves.
 * Les élèves sans classe ou sans tarif configuré sont ignorés.
 */
export async function ensureMonthlyDuesForStudents(studentIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(studentIds));
  await Promise.all(uniqueIds.map((id) => ensureMonthlyDueForStudent(id)));
}
