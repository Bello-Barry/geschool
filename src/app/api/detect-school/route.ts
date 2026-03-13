import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const detectSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = detectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const email = validation.data.email.trim().toLowerCase();

    const supabase = await createClient();

    console.log('Recherche d\'établissement pour l\'email:', email);

    // 1. Rechercher d'abord dans la table 'schools' (email de l'administrateur de l'école)
    const { data: schoolByEmail, error: schoolError } = await supabase
      .from('schools')
      .select('subdomain, name')
      .eq('email', email)
      .maybeSingle();

    if (schoolError) {
      console.error('Erreur technique lors de la recherche dans schools:', schoolError);
    }

    if (schoolByEmail) {
      console.log('Établissement trouvé via la table schools:', schoolByEmail);
      return NextResponse.json({
        subdomain: schoolByEmail.subdomain,
        schoolName: schoolByEmail.name,
        email,
      });
    }

    // 2. Si non trouvé, rechercher dans la table 'users' (profils utilisateurs)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('school_id, schools(subdomain, name)')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Erreur technique lors de la recherche dans users:', profileError);
      return NextResponse.json(
        { error: 'Erreur technique lors de la recherche' },
        { status: 500 }
      );
    }

    console.log('Résultat brut de la recherche dans users:', userProfile);

    if (userProfile && userProfile.schools) {
      const school = userProfile.schools as unknown as { subdomain: string; name: string };
      return NextResponse.json({
        subdomain: school.subdomain,
        schoolName: school.name,
        email,
      });
    }

    // 3. Pas trouvé du tout
    return NextResponse.json(
      { error: 'Établissement non trouvé' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Si quelqu'un navigue directement à l'URL dans le navigateur,
  // rediriger vers la page d'accueil où se trouve le formulaire de détection.
  const url = new URL('/', request.url);
  url.hash = 'detect-school';
  return NextResponse.redirect(url);
}
