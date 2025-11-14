import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

interface School {
  id: string;
  name: string;
  subdomain: string | null;
  primary_color?: string | null;
}

/**
 * Récupère une école par son sous-domaine
 * Mise en cache pour éviter des appels répétés
 */
export const getSchoolBySubdomain = cache(async (subdomain: string): Promise<School | null> => {
  try {
    const supabase = await createClient();
    
    const { data: schools, error } = await supabase
      .from('schools')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('is_active', true);
    
    if (error || !schools || schools.length === 0) {
      console.error('Error fetching school:', error);
      return null;
    }
    
    return schools[0] as School;
  } catch (error) {
    console.error('Exception in getSchoolBySubdomain:', error);
    return null;
  }
});

/**
 * Récupère l'école depuis les headers dans un Server Component
 */
export async function getSchoolFromHeaders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any
): Promise<School | null> {
  const schoolId = headers.get?.('x-school-id') || headers['x-school-id'];
  const schoolName = headers.get?.('x-school-name') || headers['x-school-name'];
  const schoolSubdomain = headers.get?.('x-school-subdomain') || headers['x-school-subdomain'] || undefined;
  
  if (!schoolId || !schoolName) {
    return null;
  }
  
  return {
    id: schoolId,
    name: schoolName,
    subdomain: schoolSubdomain ?? null,
  };
}

/**
 * Découvre l'école d'un utilisateur par email
 */
export async function detectSchoolByEmail(email: string): Promise<{ id: string; subdomain: string | null; name: string } | null> {
  const supabase = await createClient();
  
  const { data: users, error } = await supabase
    .from('users')
    .select('school_id, schools(subdomain, name)')
    .eq('email', email);
  
  if (error || !users || users.length === 0) {
    return null;
  }
  
  const user = users[0] as unknown as { school_id: string; schools: { subdomain: string; name: string } };
  if (!user) return null;
  
  const school = user.schools;
  
  return {
    id: user.school_id,
    subdomain: school?.subdomain || null,
    name: school?.name || '',
  };
}