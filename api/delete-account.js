import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    response.status(501).json({
      error:
        'Account hard delete not configured. Add SUPABASE_SERVICE_ROLE_KEY on Vercel.',
    })
    return
  }

  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  if (!token) {
    response.status(401).json({ error: 'Missing authorization token' })
    return
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await userClient.auth.getUser()

  if (error || !data.user) {
    response.status(401).json({ error: 'Invalid authorization token' })
    return
  }

  await adminClient.from('account_deletion_requests').insert({
    user_id: data.user.id,
    email: data.user.email ?? null,
    reason: 'self_service_hard_delete',
    status: 'processing',
  })

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    data.user.id,
  )

  if (deleteError) {
    response.status(500).json({ error: deleteError.message })
    return
  }

  response.setHeader('Cache-Control', 'private, no-store')
  response.status(200).json({ ok: true })
}
