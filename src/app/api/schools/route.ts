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

const updateSchoolSchema = z.object({
  name: z.string().min(1, "Nom requis").optional(),
  logo_url: z.string().optional().nullable(),
  primary_color: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
});

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) {
    return NextResponse.json({ error: 'No school found' }, { status: 404 })
  }

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', profile.school_id)
    .single()

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json(school)
}

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

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin_school' && profile.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchoolSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const updates: Record<string, any> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', profile.school_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
