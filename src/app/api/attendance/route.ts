import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyParentsOfAbsence, getParentUserIds } from "@/lib/notifications/create";
import { sendAbsenceEmail } from "@/lib/notifications/email";

const attendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  status: z.enum(["present", "absent", "late", "excused"]),
  reason: z.string().optional(),
});

const postSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(attendanceRecordSchema).min(1),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const date = searchParams.get("date");

  if (!classId || !date) {
    return NextResponse.json({ error: "classId and date are required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("class_id", classId)
      .eq("date", date);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "teacher" && profile.role !== "admin_school" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = postSchema.parse(body);

    if (profile.role === "teacher") {
      const { data: teacherRec } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!teacherRec) return NextResponse.json({ error: "Teacher profile not found" }, { status: 403 });

      const { count, error: countError } = await supabase
        .from("teacher_subjects")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherRec.id)
        .eq("class_id", validated.class_id);

      if (countError) throw countError;
      if (!count || count === 0) {
        return NextResponse.json({ error: "You are not assigned to this class" }, { status: 403 });
      }
    }

    const records = validated.records.map(r => ({
      student_id: r.student_id,
      class_id: validated.class_id,
      school_id: profile.school_id,
      date: validated.date,
      status: r.status,
      reason: r.reason || null,
    }));

    const { data, error } = await supabase
      .from("attendance")
      .upsert(records, { onConflict: "student_id, date", ignoreDuplicates: false })
      .select();

    if (error) throw error;

    const supabaseAdmin = createAdminClient();

    for (const record of records) {
      if (record.status === "absent") {
        notifyParentsOfAbsence(record.student_id, profile.school_id, validated.date).catch(
          (err) => console.error("Absence notification error:", err)
        );

        const childParentUserIds = await getParentUserIds(record.student_id);
        if (childParentUserIds.length > 0) {
          const { data: studentData } = await supabaseAdmin
            .from("students")
            .select("user:user_id(first_name, last_name)")
            .eq("id", record.student_id)
            .single();

          const studentInfo = studentData?.user as unknown as { first_name: string; last_name: string } | null;
          const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : "Votre enfant";

          const { data: school } = await supabaseAdmin
            .from("schools")
            .select("name, subdomain")
            .eq("id", profile.school_id)
            .single();

          const { data: parentRecords } = await supabaseAdmin
            .from("parents")
            .select("user:user_id(email, first_name, last_name)")
            .in("user_id", childParentUserIds);

          if (parentRecords) {
            for (const parent of parentRecords as unknown as Array<{ user: { email: string; first_name: string; last_name: string } | null }>) {
              if (parent.user?.email) {
                sendAbsenceEmail({
                  parentEmail: parent.user.email,
                  parentFirstName: parent.user.first_name,
                  studentName,
                  date: validated.date,
                  schoolName: school?.name || "",
                  schoolSlug: school?.subdomain || "",
                }).catch(() => {});
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /api/attendance error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
