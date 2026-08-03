import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { DeleteScheduleButton } from "./delete-schedule-button";

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

export default async function AdminSchedulePage({ params }: { params: Promise<{ ecole: string }> }) {
  const slug = (await params).ecole;
  const auth = await getAuthUser(slug);
  if (!auth || (auth.role !== "admin_school" && auth.role !== "super_admin")) redirect(`/${slug}/login`);

  const supabase = createAdminClient();
  const schoolId = auth.schoolId;

  const { data: slots } = await supabase
    .from("schedule_slots")
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      room_number,
      class:class_id(id, name),
      teacher_subject:teacher_subject_id(
        id,
        teacher:teacher_id(id, user:user_id(first_name, last_name)),
        subject:subject_id(id, name, coefficient)
      )
    `)
    .eq("school_id", schoolId)
    .order("day_of_week")
    .order("start_time");

  const grouped: Record<number, typeof slots> = {};
  for (let i = 0; i < 5; i++) grouped[i] = [];
  for (const s of slots || []) {
    if (s.day_of_week < 5) grouped[s.day_of_week]?.push(s);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emploi du temps"
        description="Gérez les créneaux horaires des classes."
        actions={
          <Button asChild>
            <Link href={`/${slug}/admin/schedule/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau créneau
            </Link>
          </Button>
        }
      />

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {DAY_LABELS.map((day, i) => (
          <div key={i} className="rounded-lg border">
            <div className="font-semibold text-sm p-3 border-b bg-muted/50">{day}</div>
            <div className="p-2 space-y-2 min-h-[300px]">
              {(grouped[i] || []).length === 0 && (
                <p className="text-xs text-muted-foreground p-2">Aucun créneau</p>
              )}
              {(grouped[i] || []).map((slot: any) => (
                <div key={slot.id} className="rounded border p-2 text-xs space-y-1 relative group">
                  <div className="font-medium">{slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}</div>
                  <div>{slot.teacher_subject?.subject?.name || "—"}</div>
                  <div className="text-muted-foreground">
                    {slot.teacher_subject?.teacher?.user?.first_name} {slot.teacher_subject?.teacher?.user?.last_name}
                  </div>
                  <div className="text-muted-foreground">
                    Classe: {slot.class?.name}
                  </div>
                  {slot.room_number && <div>Salle: {slot.room_number}</div>}
                  <div className="flex gap-1 mt-1">
                    <Button asChild variant="ghost" size="icon" className="h-6 w-6">
                      <Link href={`/${slug}/admin/schedule/${slot.id}/edit`} aria-label="Modifier">
                        <Pencil className="h-3 w-3" />
                      </Link>
                    </Button>
                    <DeleteScheduleButton id={slot.id} slug={slug} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: list */}
      <div className="md:hidden space-y-3">
        {(!slots || slots.length === 0) && (
          <p className="text-muted-foreground text-sm">Aucun créneau défini</p>
        )}
        {slots?.filter((s: any) => s.day_of_week < 5).map((slot: any) => (
          <div key={slot.id} className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {DAY_LABELS[slot.day_of_week]} {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
              </span>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                  <Link href={`/${slug}/admin/schedule/${slot.id}/edit`} aria-label="Modifier">
                    <Pencil className="h-3 w-3" />
                  </Link>
                </Button>
                <DeleteScheduleButton id={slot.id} slug={slug} />
              </div>
            </div>
            <div className="text-sm">{slot.teacher_subject?.subject?.name || "—"}</div>
            <div className="text-xs text-muted-foreground">
              {slot.teacher_subject?.teacher?.user?.first_name} {slot.teacher_subject?.teacher?.user?.last_name} — {slot.class?.name}
            </div>
            {slot.room_number && <div className="text-xs text-muted-foreground">Salle: {slot.room_number}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
