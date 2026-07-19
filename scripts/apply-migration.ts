import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
config({ path: resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const sql = readFileSync(
    resolve(__dirname, "..", "supabase", "migrations", "20260719000000_create_schedule_slots.sql"),
    "utf-8"
  );

  // Try to use the supabase-js admin client to check if the table already exists
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Try a simple query to see if the table exists
  const { error } = await supabase.from("schedule_slots").select("id", { count: "exact", head: true });
  if (!error) {
    console.log("Table schedule_slots already exists");
    return;
  }

  console.log("Table does not exist yet. Error:", error.message);

  // We need to create it via direct SQL.
  // Method: Use the Supabase Management API (requires SUPABASE_ACCESS_TOKEN env var)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.log("");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  To create the schedule_slots table, you need to:          ║");
    console.log("║                                                           ║");
    console.log("║  1. Go to https://supabase.com/dashboard/project/         ║");
    console.log(`║     ${SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")} ║`);
    console.log("║     → SQL Editor → New Query                               ║");
    console.log("║                                                           ║");
    console.log("║  2. Paste the contents of:                                 ║");
    console.log("║     supabase/migrations/20260719000000_create_schedule_slots.sql  ║");
    console.log("║                                                           ║");
    console.log("║  3. Run the query                                          ║");
    console.log("║                                                           ║");
    console.log("║  OR set SUPABASE_ACCESS_TOKEN env var to auto-apply.       ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    process.exit(1);
  }

  // Apply via Management API
  const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (mgmtRes.ok) {
    console.log("Migration applied successfully via Management API");
  } else {
    const errText = await mgmtRes.text();
    console.error("Failed to apply migration:", mgmtRes.status, errText);
    process.exit(1);
  }
}

main().catch(console.error);
