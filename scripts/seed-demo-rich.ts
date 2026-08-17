import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key);

const SCHOOL_SUB = "lycee-sassou";

async function run() {
  const { data: school } = await admin.from("schools").select("id").eq("subdomain", SCHOOL_SUB).single();
  if (!school) throw new Error("École introuvable");
  const schoolId = school.id;

  const [{ data: students }, { data: subjects }, { data: terms }, { data: academicYears }, { data: classes }] =
    await Promise.all([
      admin.from("students").select("id, user_id:user_id(id,email), class_id").eq("school_id", schoolId).order("created_at"),
      admin.from("subjects").select("id, name").eq("school_id", schoolId),
      admin.from("terms").select("id, term_number, name").eq("school_id", schoolId).order("term_number"),
      admin.from("academic_years").select("id, name, is_current").eq("school_id", schoolId).order("created_at", { ascending: false }),
      admin.from("classes").select("id, name").eq("school_id", schoolId),
    ]);

  console.log(`students=${students?.length} subjects=${subjects?.length} terms=${terms?.length} classes=${classes?.length}`);
  if (!students?.length || !subjects?.length || !terms?.length) return;

  const currentYear = (academicYears ?? []).find((a: any) => a.is_current) ?? academicYears?.[0];
  const term1 = terms.find((t: any) => t.term_number === 1) ?? terms[0];
  const classId = students[0].class_id;
  const subjectNames = ["Mathématiques", "Français", "Anglais"];
  const chosen = (subjects as any[]).filter((s) => subjectNames.includes(s.name));

  const { count: gradeCount } = await admin.from("grades").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
  const { count: attendanceCount } = await admin.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", schoolId);

  const levelMap: Record<string, number> = {};
  (students as any[]).forEach((s, i) => {
    levelMap[s.id] = [15.5, 12.5, 13.5, 16.5, 11.5, 14.5, 12, 17, 13, 10.5, 14, 11][i % 12];
  });

  // ══ NOTES ════════════════════════════════════════════
  if ((gradeCount ?? 0) < 40 && chosen.length >= 2 && term1) {
    const grades: any[] = [];
    (students as any[]).forEach((s) => {
      const base = levelMap[s.id];
      chosen.forEach((subj, si) => {
        const typeAvg: Record<string, number> = { homework: base - 1, test: base, exam: base + 0.5 };
        (["homework", "test", "exam"] as const).forEach((gtype) => {
          const jitter = ((s.id.charCodeAt(0) + si * 7 + (gtype === "homework" ? 2 : gtype === "test" ? 5 : 9)) % 3) - 1;
          let score = Math.round((typeAvg[gtype] + jitter) * 2) / 2;
          score = Math.min(20, Math.max(4, score));
          grades.push({
            student_id: s.id,
            subject_id: subj.id,
            term_id: term1.id,
            school_id: schoolId,
            grade_type: gtype,
            score,
            max_score: 20,
            date: gtype === "exam" ? "2025-11-28" : gtype === "test" ? "2025-11-14" : "2025-11-07",
            comments: gtype === "exam" ? "Examen du premier trimestre" : gtype === "test" ? "Interrogation écrite" : "Devoir à la maison",
          });
        });
      });
    });
    const { error } = await admin.from("grades").insert(grades);
    if (error) console.error("notes insert:", error.message);
    else console.log(`notes ajoutées: ${grades.length}`);
  } else {
    console.log("notes: déjà assez (skip)");
  }

  // ══ PRÉSENCES ═══════════════════════════════════════
  await admin.from("attendance").delete().eq("school_id", schoolId);
  if (classId) {
    const weekdays = (days: number, back: number) => {
      const out: string[] = [];
      let d = new Date();
      d.setDate(d.getDate() - back);
      while (out.length < days) {
        if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() - 1);
      }
      return out;
    };
    const dates = weekdays(6, 30);
    const rows: any[] = [];
    (students as any[]).forEach((s, i) => {
      dates.forEach((date, di) => {
        const seed = (i * 5 + di * 3) % 10;
        const status = seed >= 8 ? "absent" : seed >= 5 ? "late" : "present";
        if (seed >= 8 && date === dates[0]) {
          // raison pour les absents les plus récents
        }
        rows.push({ student_id: s.id, class_id: classId, school_id: schoolId, date, status, reason: status === "absent" && date === dates[0] ? "Maladie" : null });
      });
    });
    const { error } = await admin.from("attendance").insert(rows);
    if (error) console.error("présences insert:", error.message);
    else console.log(`présences ajoutées: ${rows.length}`);
  } else {
    console.log("présences: skip (pas de classe)");
  }

  // ══ PAIEMENTS ═══════════════════════════════════════
  const chantal = (students as any[]).find((s) => (s.user_id?.email ?? "").startsWith("chantal"));
  const esther = (students as any[]).find((s) => (s.user_id?.email ?? "").startsWith("esther"));
  const { count: payCount } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
  if ((payCount ?? 0) < 10) {
    const target = [chantal, esther].filter(Boolean);
    const rows: any[] = [];
    target.forEach((s, i) => {
      const monies = [
        { amount: s === chantal ? 150000 : 120000, method: "mobile_money", date: "2025-09-10", label: "Scolarité Septembre" },
        { amount: s === chantal ? 150000 : 120000, method: "cash", date: "2025-10-15", label: "Scolarité Octobre" },
        { amount: s === chantal ? 150000 : 120000, method: "mobile_money", date: "2025-11-20", label: "Scolarité Novembre" },
      ];
      monies.forEach((m) => {
        rows.push({ student_id: s.id, school_id: schoolId, academic_year_id: currentYear?.id, amount: m.amount, payment_date: m.date, payment_method: m.method, reference_number: `PR-${2025}${String(9000 + i)}`, notes: m.label });
      });
    });
    const { error } = await admin.from("payments").insert(rows);
    if (error) console.error("paiements insert:", error.message);
    else console.log(`paiements ajoutés: ${rows.length}`);
  } else {
    console.log("paiements: déjà assez (skip)");
  }

  // ══ MESSAGES (enseignant ↔ parents d'Alain) ══════════
  const jean = (await admin.from("users").select("id").eq("school_id", schoolId).eq("email", "jean.mbokani@lycee-sassou.cd").single()).data;
  const antoine = (await admin.from("users").select("id").eq("school_id", schoolId).eq("email", "antoine.mabiala@parent.cd").single()).data;
  const sophie = (await admin.from("users").select("id").eq("school_id", schoolId).eq("email", "sophie.mabiala@parent.cd").single()).data;
  if (jean && antoine) {
    const existing = await admin.from("conversations").select("id").eq("school_id", schoolId).ilike("title", "Suivi d'Alain%").limit(1);
    if (!existing.data?.length) {
      const conv = await admin.from("conversations").insert({ school_id: schoolId, title: "Suivi d'Alain Mabiala", created_by: jean.id }).select("id").single();
      if (conv.error) console.error("conv insert:", conv.error.message);
      else if (conv.data) {
        const parts = [jean.id, antoine.id];
        if (sophie) parts.push(sophie.id);
        await admin.from("conversation_participants").insert(parts.map((uid) => ({ conversation_id: conv.data.id, user_id: uid })));
        const msgs = [
          { sender_id: jean.id, content: "Bonjour, je vous informe des excellents résultats d'Alain en mathématiques ce trimestre." },
          { sender_id: antoine.id, content: "Merci professeur ! Nous sommes très fiers de lui." },
          { sender_id: jean.id, content: "Il progresse beaucoup, notamment en géométrie. Je vous encourage à le laisser participer au concours de mathématiques." },
          { sender_id: sophie?.id ?? antoine.id, content: "Excellente idée, nous allons l'inscrire dès ce week-end." },
          { sender_id: jean.id, content: "Parfait, je vous enverrai les détails de la compétition par message. Bonne journée !" },
        ].map((m, i) => ({ conversation_id: conv.data.id, sender_id: m.sender_id, content: m.content, created_at: `2025-12-01T0${8 + Math.floor(i / 2)}:${String(10 + i * 7).padStart(2, "0")}:00+00:00` }));
        const { error } = await admin.from("messages").insert(msgs);
        if (error) console.error("messages insert:", error.message);
        else console.log(`messages ajoutés: ${msgs.length}`);
      }
    } else {
      console.log("conversation existe déjà (skip)");
    }
  }

  // Récapitulatif
  const summary: Record<string, number> = {};
  for (const t of ["grades", "attendance", "payments", "messages", "conversations", "notifications", "report_cards", "schedule_slots"]) {
    const c: any = await (async () => {
      if (!["grades", "attendance", "payments", "notifications", "report_cards", "schedule_slots"].includes(t)) return null;
      const { count } = await admin.from(t as any).select("id", { count: "exact", head: true }).eq("school_id", schoolId);
      return count;
    })();
    if (c !== null) summary[t] = c;
  }
  const { count: msg } = await admin.from("messages").select("id", { count: "exact", head: true });
  summary.messages = msg ?? 0;
  console.log(summary);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});