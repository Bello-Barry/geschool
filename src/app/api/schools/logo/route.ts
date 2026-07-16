import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin_school" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez PNG, JPEG ou WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux. Taille maximum : 2 Mo." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "school-logos");
    if (!bucketExists) {
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket("school-logos", {
        public: true,
        allowedMimeTypes: ALLOWED_TYPES,
      });
      if (bucketErr) throw new Error(`Erreur de création du bucket: ${bucketErr.message}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const filePath = `${profile.school_id}/logo`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("school-logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) throw new Error(`Erreur d'upload: ${uploadErr.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("school-logos")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateErr } = await supabaseAdmin
      .from("schools")
      .update({ logo_url: publicUrl })
      .eq("id", profile.school_id);

    if (updateErr) throw new Error(`Erreur de mise à jour: ${updateErr.message}`);

    return NextResponse.json({ logo_url: publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Logo upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
