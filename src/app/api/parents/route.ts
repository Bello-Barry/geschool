import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const parentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  profession: z.string().optional(),
  student_ids: z.array(z.string().uuid()).optional(),
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
    const { data: parents, error } = await supabase
      .from("parents")
      .select(`
        *,
        user:user_id(*)
      `)
      .eq("school_id", schoolId);

    if (error) throw error;

    return NextResponse.json(parents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch parents" }, { status: 500 });
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

  // Vérifier que c'est un admin
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
    const validated = parentSchema.parse(body);

    const adminClient = createAdminClient();
    const tempPassword = crypto.randomBytes(12).toString('hex');

    // Créer l'utilisateur dans auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validated.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: validated.first_name,
        last_name: validated.last_name,
        role: "parent"
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
        role: "parent",
        first_name: validated.first_name,
        last_name: validated.last_name,
        phone: validated.phone,
      });

    if (userError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    // Créer le record parent
    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .insert({
        user_id: authData.user.id,
        school_id: schoolId,
        relationship: validated.relationship,
        profession: validated.profession,
      })
      .select()
      .single();

    if (parentError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw parentError;
    }

    // Lier aux élèves si fourni
    if (validated.student_ids && validated.student_ids.length > 0) {
      const links = validated.student_ids.map(studentId => ({
        student_id: studentId,
        parent_id: parent.id,
      }));
      await supabase.from("student_parents").insert(links);
    }

    return NextResponse.json(parent, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create parent" }, { status: 500 });
  }
}
