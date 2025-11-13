import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

/**
 * Récupère une école par son sous-domaine
 * Mise en cache pour éviter des appels répétés
 */
export const getSchoolBySubdomain = cache(async (subdomain: string) => {
  try {
    const supabase = createClient();
    
    const { data: school, error } = await supabase
      .from('schools')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Error fetching school:', error);
      return null;
    }
    
    return school;
  } catch (error) {
    console.error('Exception in getSchoolBySubdomain:', error);
    return null;
  }
});

/**
 * Récupère l'école depuis les headers dans un Server Component
 */
export async function getSchoolFromHeaders(headers: Headers) {
  const schoolId = headers.get('x-school-id');
  const schoolName = headers.get('x-school-name');
  const schoolSubdomain = headers.get('x-school-subdomain');
  const schoolColor = headers.get('x-school-color');
  
  if (!schoolId || !schoolName) {
    return null;
  }
  
  return {
    id: schoolId,
    name: schoolName,
    subdomain: schoolSubdomain,
    primary_color: schoolColor,
  };
}

/**
 * Découvre l'école d'un utilisateur par email
 */
export async function detectSchoolByEmail(email: string) {
  const supabase = createClient();
  
  const { data: user, error } = await supabase
    .from('users')
    .select('school_id, schools(subdomain, name)')
    .eq('email', email)
    .single();
  
  if (error || !user) {
    return null;
  }
  
  // @ts-ignore
  const school = user.schools;
  
  return {
    id: user.school_id,
    subdomain: school.subdomain,
    name: school.name,
  };
}