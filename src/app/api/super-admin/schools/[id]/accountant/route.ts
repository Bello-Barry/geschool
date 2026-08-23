import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getSuperAdminClient } from "@/lib/utils/super-admin-auth";
import { sendWelcomeEmail } from "@/lib/notifications/email";

const accountantSchema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
});

// POST /api/super-admin/schools/[id]/accountant
// Crée un compte comptable (accountant) rattaché à une école.
// Plusieurs comptables sont autorisés (accès strict : lecture seule des finances).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = await getSuperAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id: schoolId } = await params;

  try {
    // 1. Vérifier que l'école existe
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id, name, subdomain")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError || !school) {
      return NextResponse.json({ error: "École introuvable" }, { status: 404 });
    }

    // 2. Valider le body
    const body = await request.json();
    const validated = accountantSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { first_name, last_name, email } = validated.data;

    // 3. Vérifier que l'email n'est pas déjà utilisé
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, role, school_id")
      .ilike("email", email)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.role === "super_admin") {
        return NextResponse.json(
          { error: "Cet email appartient à un compte super admin plateforme" },
          { status: 409 }
        );
      }
      if (existingUser.school_id === schoolId) {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email existe déjà dans cette école" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Cet email est déjà rattaché à une autre école" },
        { status: 409 }
      );
    }

    // 4. Créer le compte auth + le profil users
    const tempPassword = crypto.randomBytes(12).toString("hex");

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role: "accountant",
        school_id: schoolId,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Erreur lors de la création du compte" },
        { status: 500 }
      );
    }

    const { error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        school_id: schoolId,
        email,
        role: "accountant",
        first_name,
        last_name,
      });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // 5. Email de bienvenue (ne bloque pas la création)
    sendWelcomeEmail({
      email,
      tempPassword,
      firstName: first_name,
      lastName: last_name,
      role: "accountant",
      schoolName: school.name,
      schoolSlug: school.subdomain || "",
    }).catch(() => {});

    return NextResponse.json(
      {
        message: "Comptable créé avec succès",
        tempPassword,
        email,
        firstName: first_name,
        lastName: last_name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create accountant API error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}