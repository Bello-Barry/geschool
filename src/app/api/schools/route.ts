import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchoolSchema = z.object({
  name: z.string(),
  subdomain: z.string().regex(/^[a-z0-9-]+$/),
  slogan: z.string().optional(),
  logo_url: z.string().url().optional(),
  address: z.string(),
  phone_number: z.string(),
  email: z.string().email(),
});


export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createSchoolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { name, subdomain, slogan, logo_url, address, phone_number, email } = parsed.data

  const { data, error } = await supabase
    .from('schools')
    .insert([{ name, subdomain, slogan, logo_url, address, phone_number, email, owner_id: user.id }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Update the user's school_id
  const { error: updateUserError } = await supabase
    .from('users')
    .update({ school_id: data.id })
    .eq('id', user.id);

  if (updateUserError) {
    console.error('Error updating user:', updateUserError);
    // Rollback: delete the school
    const { error: deleteError } = await supabase.from('schools').delete().eq('id', data.id)
    if (deleteError) {
      console.error('Failed to delete orphaned school:', deleteError)
    }
    return NextResponse.json({ error: 'Error associating user with school' }, { status: 500 });
  }

  return NextResponse.json(data)
}
