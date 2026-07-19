"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface RawSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  teacher_subject: unknown;
  class?: unknown;
}

interface ScheduleViewProps {
  slots: RawSlot[];
  showClass?: boolean;
  title?: string;
}

function unwrapTs(ts: unknown): { teacher: { first_name?: string; last_name?: string; user?: { first_name: string; last_name: string } }; subject: { name: string; coefficient: number } } | null {
  if (!ts) return null;
  const arr = Array.isArray(ts) ? ts : [ts];
  const obj = arr[0];
  if (!obj) return null;
  if (typeof obj !== "object") return null;
  return obj as any;
}

function flattenTeacher(ts: unknown): string {
  const u = unwrapTs(ts);
  if (!u) return "—";
  const t = u.teacher;
  if (!t) return "—";
  if (t.first_name) return `${t.first_name} ${t.last_name}`;
  if (t.user) return `${t.user.first_name} ${t.user.last_name}`;
  return "—";
}

function subjectName(ts: unknown): string {
  const u = unwrapTs(ts);
  return u?.subject?.name || "—";
}

function className(cls: unknown): string {
  if (!cls) return "";
  const arr = Array.isArray(cls) ? cls : [cls];
  const obj = arr[0] as any;
  return obj?.name || "";
}

export function ScheduleView({ slots, showClass, title }: ScheduleViewProps) {
  const grouped: RawSlot[][] = [[], [], [], [], [], [], []];
  for (const s of slots) {
    const arr = grouped[s.day_of_week];
    if (arr) arr.push(s);
  }
  for (const arr of grouped) {
    arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <div className="space-y-6">
      {title && <h1 className="text-2xl font-bold">{title}</h1>}

      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {DAY_LABELS.slice(0, 5).map((day, i) => {
          const daySlots = grouped[i]!;
          return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 min-h-[200px]">
              {daySlots.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun cours</p>
              )}
              {daySlots.map((slot) => (
                <div key={slot.id} className="rounded border p-2 text-xs space-y-1">
                  <div className="font-medium">
                    {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
                  </div>
                  <div>{subjectName(slot.teacher_subject)}</div>
                  <div className="text-muted-foreground">
                    {flattenTeacher(slot.teacher_subject)}
                  </div>
                  {showClass && className(slot.class) && (
                    <Badge variant="outline" className="text-[10px]">{className(slot.class)}</Badge>
                  )}
                  {slot.room_number && (
                    <div className="text-muted-foreground">Salle: {slot.room_number}</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          );
        })}
      </div>

      <div className="md:hidden space-y-4">
        {slots.length === 0 && <p className="text-muted-foreground text-sm">Aucun cours programmé</p>}
        {DAY_LABELS.slice(0, 5).map((day, i) => {
          const daySlots = grouped[i]!;
          if (daySlots.length === 0) return null;
          return (
            <div key={i}>
              <h3 className="font-semibold text-sm mb-2 sticky top-14 bg-background py-1 z-10">{day}</h3>
              <div className="space-y-2">
                {daySlots.map((slot) => (
                  <div key={slot.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
                      </span>
                      {slot.room_number && (
                        <span className="text-xs text-muted-foreground">{slot.room_number}</span>
                      )}
                    </div>
                    <div className="text-sm">{subjectName(slot.teacher_subject)}</div>
                    <div className="text-xs text-muted-foreground">
                      {flattenTeacher(slot.teacher_subject)}
                    </div>
                    {showClass && className(slot.class) && (
                      <Badge variant="outline" className="text-[10px]">{className(slot.class)}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
