import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const studentSchema = z.object({
  matricule: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  class_id: z.string().uuid(),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const schoolId = request.headers.get("x-school-id");

  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        *,
        user:user_id(*),
        class:class_id(*)
      `)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json(students);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const schoolId = request.headers.get("x-school-id");

  if (!schoolId) {
    return NextResponse.json({ error: "No school found" }, { status: 400 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier que c'est un admin et qu'il appartient à cette école
  const { data: user } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", session.user.id)
    .single();

  if (!user || (user.role !== "admin_school" && user.role !== "super_admin") || user.school_id !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = studentSchema.parse(body);

    const adminClient = createAdminClient();

    // Générer un mot de passe temporaire sécurisé
    const tempPassword = crypto.randomBytes(12).toString('hex');

    // Créer l'utilisateur dans auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validated.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: validated.first_name,
        last_name: validated.last_name,
        role: "student"
      }
    });

    if (authError) throw new Error(authError.message);

    // Créer le record user
    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        school_id: schoolId,
        email: validated.email,
        role: "student",
        first_name: validated.first_name,
        last_name: validated.last_name,
      });

    if (userError) {
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    // Créer le record student
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        user_id: authData.user.id,
        school_id: schoolId,
        matricule: validated.matricule,
        class_id: validated.class_id,
        date_of_birth: validated.date_of_birth,
        place_of_birth: validated.place_of_birth,
        gender: validated.gender,
      })
      .select()
      .single();

    if (studentError) {
      // Rollback auth user (user profile will be deleted by cascade if FK is set)
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw studentError;
    }

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create student" }, { status: 500 });
  }
}
