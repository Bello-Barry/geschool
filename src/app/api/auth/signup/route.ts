import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string(),
  last_name: z.string(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = signupSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { email, password, first_name, last_name } = parsed.data

  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name,
        last_name,
      },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!user) {
    return NextResponse.json({ error: 'User not created' }, { status: 500 })
  }

  // Insert additional user info into the 'users' table
  const { error: insertError } = await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    first_name,
    last_name,
    role: 'admin_school', // Default role for new users
  });

  if (insertError) {
    console.error('Error inserting user:', insertError);
    // Rollback: delete the auth user
    const supabaseAdmin = createAdminClient()
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('Failed to delete orphaned auth user:', deleteError)
    }
    return NextResponse.json({ error: 'Error creating user profile' }, { status: 500 });
  }


  return NextResponse.json({ user })
}
