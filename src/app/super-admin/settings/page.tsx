import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsTabs } from "@/components/super-admin/settings-tabs";

export const metadata = {
  title: "Paramètres — Super Admin",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabaseAdmin = createAdminClient();

  const { data: superAdmins } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name, created_at")
    .eq("role", "super_admin")
    .order("created_at", { ascending: true });

  const integrations = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    resend: !!process.env.RESEND_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paramètres Plateforme</h2>
        <p className="text-muted-foreground mt-1">
          Configuration système, comptes racine et journalisation de la console GESchool.
        </p>
      </div>

      <SettingsTabs
        integrations={integrations}
        superAdmins={(superAdmins ?? []).map((a) => ({
          id: a.id,
          email: a.email ?? null,
          first_name: a.first_name ?? null,
          last_name: a.last_name ?? null,
          created_at: a.created_at ?? null,
        }))}
      />
    </div>
  );
}
