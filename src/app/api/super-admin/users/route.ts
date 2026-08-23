import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeAuthCookie, getAuthCookieName } from "@/lib/utils/session-resolver";
import { cookies } from "next/headers";

const createPlatformAccountSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

// Crée un compte plateforme (super_admin) découplé de toute école.
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookieName = getAuthCookieName();
    const authCookie = cookieStore.get(authCookieName);
    const session = decodeAuthCookie(authCookie?.value ?? "");

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createPlatformAccountSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { firstName, lastName, email, password } = validation.data;

    // Empêcher un doublon d'email sur la plateforme.
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 409 });
    }

    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (signUpError || !user) {
      return NextResponse.json(
        { error: signUpError?.message || "Erreur lors de la création de l'utilisateur" },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: user.id,
      school_id: null,
      email,
      first_name: firstName,
      last_name: lastName,
      role: "super_admin",
    });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return NextResponse.json(
        { error: "Erreur lors de la création du profil utilisateur" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Compte plateforme créé avec succès" }, { status: 201 });
  } catch (error) {
    console.error("Super Admin Create Platform Account error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
