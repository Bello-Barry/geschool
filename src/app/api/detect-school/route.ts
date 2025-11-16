import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const detectSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = detectSchema.parse(body);

    const supabase = await createClient();

    // Rechercher l'utilisateur par email
    const { data: users, error } = await supabase
      .from('users')
      .select('school_id, schools(subdomain, name)')
      .eq('email', email);

    if (error || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'Aucun utilisateur trouvé avec cet email' },
        { status: 404 }
      );
    }

    const user = users[0] as unknown as { schools: { subdomain: string; name: string } };

    const school = user.schools;

    if (!school) {
      return NextResponse.json(
        { error: 'École non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      subdomain: school.subdomain,
      schoolName: school.name,
      email,
    });

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