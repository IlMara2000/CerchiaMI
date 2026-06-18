import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL ||
  process.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const hashSecret =
  process.env.DEVICE_HASH_SECRET || serviceRoleKey || 'cerchiami-device-fallback'

const allowedThemes = new Set(['light', 'dark', 'system'])
const allowedSections = new Set(['network', 'relationship', 'night'])

function text(value, maxLength) {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function stringList(value, maxItems = 250) {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .filter((item) => typeof item === 'string')
        .map((item) => item.slice(0, 120))
        .filter(Boolean),
    ),
  ].slice(0, maxItems)
}

function numberInRange(value, fallback, min, max) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, Math.round(parsed)))
    : fallback
}

function sanitizeState(value) {
  const source = value && typeof value === 'object' ? value : {}

  return {
    theme: allowedThemes.has(source.theme) ? source.theme : 'system',
    activeSection: allowedSections.has(source.activeSection)
      ? source.activeSection
      : 'network',
    hiddenInviteCodes: stringList(source.hiddenInviteCodes),
    passedProfileIds: stringList(source.passedProfileIds),
    nightAccepted: Boolean(source.nightAccepted),
    filters: {
      maxDistance: numberInRange(source.filters?.maxDistance, 25, 0, 1000000),
      minAge: numberInRange(source.filters?.minAge, 18, 18, 99),
      maxAge: numberInRange(source.filters?.maxAge, 45, 18, 99),
    },
  }
}

function mergeState(existing, incoming, preferRemote = false) {
  const current = sanitizeState(existing)
  const next = sanitizeState(incoming)
  const primary = preferRemote && existing ? current : next

  return {
    ...primary,
    hiddenInviteCodes: [
      ...new Set([...current.hiddenInviteCodes, ...next.hiddenInviteCodes]),
    ].slice(0, 250),
    passedProfileIds: [
      ...new Set([...current.passedProfileIds, ...next.passedProfileIds]),
    ].slice(0, 250),
    nightAccepted: current.nightAccepted || next.nightAccepted,
  }
}

function privateHash(value) {
  return createHmac('sha256', hashSecret).update(value).digest('hex')
}

function requestIp(request) {
  const forwardedFor = request.headers['x-forwarded-for']
  const raw = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor || request.socket?.remoteAddress || 'unknown'

  return String(raw).split(',')[0].trim() || 'unknown'
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!supabaseUrl || !supabasePublishableKey || !serviceRoleKey) {
    response.status(503).json({ error: 'Sincronizzazione non disponibile.' })
    return
  }

  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''

  if (!token) {
    response.status(401).json({ error: 'Sessione mancante.' })
    return
  }

  const deviceId = text(request.body?.deviceId, 128)

  if (deviceId.length < 16) {
    response.status(400).json({ error: 'Dispositivo non valido.' })
    return
  }

  const userClient = createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser()

  if (authError || !authData.user) {
    response.status(401).json({ error: 'Sessione non valida.' })
    return
  }

  const userId = authData.user.id
  const incomingState = sanitizeState(request.body?.state)
  const dataVersion = numberInRange(request.body?.dataVersion, 1, 1, 1000000)
  const preferRemote = request.body?.preferRemote === true
  const clientUpdatedAt = text(request.body?.updatedAt, 40)
  const { data: currentState, error: readError } = await adminClient
    .from('account_sync_state')
    .select('state,data_version,migrated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) {
    response.status(503).json({ error: 'Sincronizzazione non disponibile.' })
    return
  }

  const mergedState = mergeState(
    currentState?.state,
    incomingState,
    preferRemote,
  )
  const now = new Date().toISOString()
  const observedOn = now.slice(0, 10)
  const deviceIdHash = privateHash(`device:${deviceId}`)
  const ipHash = privateHash(`ip:${requestIp(request)}:${observedOn}`)
  const userAgentHash = privateHash(
    `agent:${text(request.headers['user-agent'], 500) || 'unknown'}`,
  )
  const migrationApplied =
    !currentState || Number(currentState.data_version || 0) < dataVersion
  const retentionLimit = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString()
  const { error: stateError } = await adminClient
    .from('account_sync_state')
    .upsert({
      user_id: userId,
      state: mergedState,
      data_version: dataVersion,
      client_updated_at: clientUpdatedAt || now,
      server_updated_at: now,
      migrated_at: migrationApplied
        ? now
        : currentState?.migrated_at || now,
    })
  const { error: deviceError } = await adminClient
    .from('device_connections')
    .upsert(
      {
        user_id: userId,
        device_id_hash: deviceIdHash,
        ip_hash: ipHash,
        user_agent_hash: userAgentHash,
        app_version: text(request.body?.appVersion, 40),
        data_version: dataVersion,
        migration_status: 'complete',
        last_migrated_at: now,
        last_seen_at: now,
      },
      { onConflict: 'user_id,device_id_hash' },
    )
  const { error: eventError } = await adminClient
    .from('account_device_events')
    .upsert(
      {
        user_id: userId,
        device_id_hash: deviceIdHash,
        ip_hash: ipHash,
        observed_on: observedOn,
        app_version: text(request.body?.appVersion, 40),
        data_version: dataVersion,
        migration_applied: true,
        last_seen_at: now,
      },
      {
        onConflict: 'user_id,device_id_hash,ip_hash,observed_on',
      },
    )

  if (stateError || deviceError || eventError) {
    response.status(503).json({ error: 'Sincronizzazione non completata.' })
    return
  }

  await Promise.all([
    adminClient
      .from('device_connections')
      .delete()
      .eq('user_id', userId)
      .lt('last_seen_at', retentionLimit),
    adminClient
      .from('account_device_events')
      .delete()
      .eq('user_id', userId)
      .lt('last_seen_at', retentionLimit),
  ])

  response.setHeader('Cache-Control', 'private, no-store')
  response.status(200).json({
    ok: true,
    state: mergedState,
    dataVersion,
    migrationApplied,
    syncedAt: now,
  })
}
