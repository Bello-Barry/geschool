import { createClient } from "./supabase/server";

export async function getSchoolBySubdomain(subdomain: string) {
  const supabase = await createClient();
  const { data: school, error } = await supabase
    .from('schools')
    .select('*')
    .eq('subdomain', subdomain)
    .single();

  if (error) {
    console.error('Error fetching school by subdomain:', error);
    return null;
  }

  return school;
}
