import { createAdminClient } from "@/lib/supabase/admin";

interface CreateNotificationParams {
  userId: string;
  schoolId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  link?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    school_id: params.schoolId,
    title: params.title,
    message: params.message,
    type: params.type,
    link: params.link || null,
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function getParentUserIds(studentId: string): Promise<string[]> {
  const supabase = createAdminClient();

  const { data: links } = await supabase
    .from("student_parents")
    .select("parent_id")
    .eq("student_id", studentId);

  if (!links || links.length === 0) return [];

  const parentIds = links.map((l: any) => l.parent_id);

  const { data: parents } = await supabase
    .from("parents")
    .select("user_id")
    .in("id", parentIds);

  if (!parents) return [];

  return parents.map((p: any) => p.user_id).filter(Boolean);
}

export async function notifyParentsOfGrade(studentId: string, schoolId: string, subjectName: string, score: number): Promise<void> {
  const parentUserIds = await getParentUserIds(studentId);
  if (parentUserIds.length === 0) return;

  const promises = parentUserIds.map((userId) =>
    createNotification({
      userId,
      schoolId,
      title: "Nouvelle note",
      message: `Votre enfant a reçu une note de ${score}/20 en ${subjectName}.`,
      type: "info",
    })
  );

  await Promise.allSettled(promises);
}

export async function notifyParentsOfAbsence(studentId: string, schoolId: string, dateStr: string): Promise<void> {
  const parentUserIds = await getParentUserIds(studentId);
  if (parentUserIds.length === 0) return;

  const formattedDate = new Date(dateStr).toLocaleDateString("fr-FR");

  const promises = parentUserIds.map((userId) =>
    createNotification({
      userId,
      schoolId,
      title: "Absence signalée",
      message: `Votre enfant a été marqué absent le ${formattedDate}.`,
      type: "warning",
    })
  );

  await Promise.allSettled(promises);
}

export async function notifyParentsOfReport(studentId: string, schoolId: string, reportUrl: string, termName: string): Promise<void> {
  const parentUserIds = await getParentUserIds(studentId);
  if (parentUserIds.length === 0) return;

  const promises = parentUserIds.map((userId) =>
    createNotification({
      userId,
      schoolId,
      title: "Bulletin disponible",
      message: `Le bulletin du ${termName} de votre enfant est disponible.`,
      type: "success",
      link: reportUrl,
    })
  );

  await Promise.allSettled(promises);
}
