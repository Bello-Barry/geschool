import { createAdminClient } from "@/lib/supabase/admin";
import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export interface SchoolInfo {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  primary_color: string | null;
}

export async function getSchoolBySubdomain(subdomain: string): Promise<SchoolInfo | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("id, name, subdomain, logo_url, primary_color")
      .eq("subdomain", subdomain)
      .single();
    return school as SchoolInfo | null;
  } catch {
    return null;
  }
}

export async function getSchoolFromHeaders(headers: Headers | ReadonlyHeaders) {
  const schoolId = headers.get("x-school-id");
  const schoolName = headers.get("x-school-name");
  const schoolSubdomain = headers.get("x-school-subdomain");
  const schoolColor = headers.get("x-school-color");

  if (!schoolId) return null;

  return {
    id: schoolId,
    name: schoolName || "École",
    subdomain: schoolSubdomain || "",
    primary_color: schoolColor || "#3B82F6",
  };
}

export function getSchoolFromCookies() {
  return null;
}
