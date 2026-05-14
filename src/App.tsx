import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, FormEvent, SetStateAction } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  Copy,
  Flame,
  Heart,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './App.css'

type SectionKey = 'network' | 'relationship' | 'night'
type ViewKey = 'discover' | 'matches' | 'invites' | 'profile'
type ProfileSource = 'remote'

type SectionMeta = {
  key: SectionKey
  label: string
  title: string
  detail: string
  Icon: LucideIcon
}

type Profile = {
  id: string
  name: string
  age: number
  city: string
  distance: number
  role: string
  image: string
  sections: SectionKey[]
  tags: string[]
  bio: string
  availability: string
  intentNote: string
  relationshipGoal: string
  values: string[]
  prompt: string
  dateIdea: string
  verified: boolean
  availableToday: boolean
  likedYou: boolean
  source: ProfileSource
  matchId?: string
}

type Session = {
  userId?: string
  backend: 'supabase'
  name: string
  age: number
  city: string
  inviteCode: string
  createdAt: string
  email?: string
}

type Invite = {
  id?: string
  code: string
  purpose: string
  createdAt: string
  used: boolean
  createdBy?: string | null
  usedBy?: string | null
}

type Message = {
  id: string
  from: 'me' | 'them'
  text: string
  time: string
}

type OwnProfile = {
  firstName: string
  lastName: string
  username: string
  birthDate: string
  gender: string
  relationshipGoal: string
  interests: string[]
  displayName: string
  age: number
  city: string
  bio: string
  availability: string
  sections: SectionKey[]
  visibility: 'circle' | 'matches'
}

type EmailAuthRequest = {
  mode: 'login' | 'signup'
  email: string
  password: string
}

type OnboardingDraft = {
  inviteCode: string
  firstName: string
  lastName: string
  username: string
  birthDate: string
  city: string
  gender: string
  relationshipGoal: string
  interests: string
  bio: string
  availability: string
  sections: SectionKey[]
  visibility: 'circle' | 'matches'
  accepted: boolean
}

type RemoteProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  birth_date: string | null
  gender: string | null
  relationship_goal: string | null
  interests: string[] | null
  display_name: string
  age: number
  city: string
  bio: string | null
  availability: string | null
  sections: string[] | null
  visibility: OwnProfile['visibility'] | null
}

type RemoteLikeRow = {
  from_profile: string
  to_profile: string
  section: SectionKey
}

type RemoteMatchRow = {
  id: string
  profile_a: string
  profile_b: string
  section: SectionKey
  created_at: string
}

type RemoteInviteRow = {
  id: string
  code: string
  purpose: string
  created_at: string
  used_by: string | null
  used_at: string | null
  created_by: string | null
}

type RemoteMessageRow = {
  id: string
  match_id: string
  sender_id: string
  body: string
  created_at: string
}

type RemoteState = {
  profiles: Profile[]
  likedIds: string[]
  matchedIds: string[]
  invites: Invite[]
  messages: Record<string, Message[]>
  matchByProfileId: Record<string, string>
}

const PROFILE_SELECT =
  'id, first_name, last_name, username, birth_date, gender, relationship_goal, interests, display_name, age, city, bio, availability, sections, visibility'

const SECTION_META: Record<SectionKey, SectionMeta> = {
  network: {
    key: 'network',
    label: 'Scopri',
    title: 'Persone compatibili, non swipe infiniti',
    detail:
      'Schede essenziali con intenzione, compatibilita e un primo aggancio reale.',
    Icon: Users,
  },
  relationship: {
    key: 'relationship',
    label: 'Stabile',
    title: 'Relazioni con direzione chiara',
    detail: 'Meno ambiguita, piu contesto e tempi realistici prima di scriversi.',
    Icon: Heart,
  },
  night: {
    key: 'night',
    label: 'Chimica 18+',
    title: 'Spazio adulto, consenso esplicito',
    detail: 'Accesso separato, consenso esplicito e nessuna pressione.',
    Icon: Flame,
  },
}

const PRIMARY_NAV_ITEMS: { key: ViewKey; label: string; Icon: LucideIcon }[] = [
  { key: 'discover', label: 'Scopri', Icon: Search },
  { key: 'matches', label: 'Match', Icon: Heart },
  { key: 'invites', label: 'Inviti', Icon: KeyRound },
  { key: 'profile', label: 'Profilo', Icon: User },
]

const RELATIONSHIP_GOALS = [
  { value: 'relationship', label: 'Relazione stabile' },
  { value: 'slow-dating', label: 'Conoscenza con calma' },
  { value: 'friends', label: 'Uscite e nuove persone' },
  { value: 'casual', label: 'Chimica senza pressione' },
]

const BASE_INVITES = ['CERCHIAMI-2026', 'PRIVATO-18', 'AMICI-001']

const GROUP_IMAGES = {
  rooftop:
    'https://images.unsplash.com/photo-1758272133786-ee98adcc6837?auto=format&fit=crop&w=1400&q=82',
  parkWalk:
    'https://images.unsplash.com/photo-1758613170939-05179bed0f0c?auto=format&fit=crop&w=1400&q=82',
  celebration:
    'https://images.pexels.com/photos/8920142/pexels-photo-8920142.jpeg?auto=compress&cs=tinysrgb&w=1400',
  gaming:
    'https://images.pexels.com/photos/9069367/pexels-photo-9069367.jpeg?auto=compress&cs=tinysrgb&w=1400',
  mountain:
    'https://images.pexels.com/photos/11724800/pexels-photo-11724800.jpeg?auto=compress&cs=tinysrgb&w=1400',
  forest:
    'https://images.pexels.com/photos/9630181/pexels-photo-9630181.jpeg?auto=compress&cs=tinysrgb&w=1400',
  roadTrip:
    'https://images.pexels.com/photos/19336206/pexels-photo-19336206.jpeg?auto=compress&cs=tinysrgb&w=1400',
  homeNight:
    'https://images.pexels.com/photos/7776098/pexels-photo-7776098.jpeg?auto=compress&cs=tinysrgb&w=1400',
}

const GROUP_IMAGE_POOL = Object.values(GROUP_IMAGES)
const LEGACY_DEMO_PROFILE_IDS = [
  'sofia',
  'luca',
  'giulia',
  'marco',
  'marta',
  'elena',
]

const EMPTY_PROFILE: OwnProfile = {
  firstName: '',
  lastName: '',
  username: '',
  birthDate: '',
  gender: '',
  relationshipGoal: '',
  interests: [],
  displayName: '',
  age: 30,
  city: '',
  bio: 'Preferisco conversazioni dirette, rispetto dei tempi e incontri leggeri.',
  availability: 'Sere in settimana e domenica pomeriggio',
  sections: ['network', 'relationship'],
  visibility: 'circle',
}

const REMOTE_STATE_EMPTY: RemoteState = {
  profiles: [],
  likedIds: [],
  matchedIds: [],
  invites: [],
  messages: {},
  matchByProfileId: {},
}

const STORAGE = {
  session: 'cerchiami.session',
  profile: 'cerchiami.profile',
  invites: 'cerchiami.invites',
  likes: 'cerchiami.likes',
  passes: 'cerchiami.passes',
  matches: 'cerchiami.matches',
  messages: 'cerchiami.messages',
  nightAccepted: 'cerchiami.nightAccepted',
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as T) : fallback
  } catch {
    return fallback
  }
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback))

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

function nowTime(date = new Date()) {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof value === 'string' ? new Date(value) : value)
}

function makeInviteCode() {
  const fragment = Math.random().toString(36).slice(2, 6).toUpperCase()
  const suffix = Math.floor(100 + Math.random() * 900)
  return `CERCHIAMI-${fragment}-${suffix}`
}

function normalizeSections(value: string[] | null | undefined): SectionKey[] {
  const sections = (value ?? []).filter((item): item is SectionKey =>
    ['network', 'relationship', 'night'].includes(item),
  )

  return sections.length ? sections : ['network']
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function stableDistance(id: string, city: string, viewerCity: string) {
  if (city.trim().toLowerCase() === viewerCity.trim().toLowerCase()) {
    return 2
  }

  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 4 + (hash % 22)
}

function avatarFor(name: string) {
  const hash = [...(name.trim() || 'CerchiaMi')].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  )

  return GROUP_IMAGE_POOL[hash % GROUP_IMAGE_POOL.length]
}

function rowToOwnProfile(row: RemoteProfileRow): OwnProfile {
  return {
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    username: row.username ?? '',
    birthDate: row.birth_date ?? '',
    gender: row.gender ?? '',
    relationshipGoal: row.relationship_goal ?? '',
    interests: row.interests ?? [],
    displayName: row.display_name,
    age: row.age,
    city: row.city,
    bio: row.bio ?? '',
    availability: row.availability ?? '',
    sections: normalizeSections(row.sections),
    visibility: row.visibility ?? 'circle',
  }
}

function ownProfileToSession(
  profile: OwnProfile,
  inviteCode: string,
  userId?: string,
  email?: string,
): Session {
  return {
    userId,
    backend: 'supabase',
    name: profile.displayName,
    age: profile.age,
    city: profile.city,
    inviteCode,
    createdAt: new Date().toISOString(),
    email,
  }
}

function rowToProfile(
  row: RemoteProfileRow,
  viewerCity: string,
  likedByIds: Set<string>,
  matchByProfileId: Record<string, string>,
): Profile {
  const sections = normalizeSections(row.sections)
  const primarySection = sections[0]
  const sectionLabel = SECTION_META[primarySection].label.toLowerCase()
  const cleanBio = row.bio?.trim()
  const availability = row.availability?.trim() || 'Disponibilita da definire'
  const interests = row.interests?.filter(Boolean) ?? []
  const relationshipGoal =
    row.relationship_goal || (primarySection === 'night' ? 'casual' : 'slow-dating')

  return {
    id: row.id,
    name: row.display_name,
    age: row.age,
    city: row.city,
    distance: stableDistance(row.id, row.city, viewerCity),
    role:
      row.visibility === 'matches'
        ? 'Profilo riservato'
        : relationshipGoalLabel(relationshipGoal),
    image: avatarFor(row.display_name),
    sections,
    tags: interests.length
      ? interests.slice(0, 4)
      : sections.map((section) => SECTION_META[section].label),
    bio:
      cleanBio ||
      'Profilo appena entrato: parti leggero e chiedi cosa cerca davvero.',
    availability,
    intentNote: `Aperto a ${sectionLabel}.`,
    relationshipGoal,
    values: interests.slice(0, 3),
    prompt:
      cleanBio ||
      'Preferisco partire da una domanda vera invece che da una frase fatta.',
    dateIdea: `Primo incontro a ${row.city}: ${availability.toLowerCase()}.`,
    verified: true,
    availableToday: /oggi|stasera|sera|weekend/i.test(availability),
    likedYou: likedByIds.has(row.id),
    source: 'remote',
    matchId: matchByProfileId[row.id],
  }
}

function calculateAge(birthDate: string) {
  const parsedDate = new Date(birthDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 0
  }

  const today = new Date()
  let age = today.getFullYear() - parsedDate.getFullYear()
  const monthDelta = today.getMonth() - parsedDate.getMonth()

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < parsedDate.getDate())
  ) {
    age -= 1
  }

  return age
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

function parseInterests(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function relationshipGoalLabel(value: string) {
  return (
    RELATIONSHIP_GOALS.find((goal) => goal.value === value)?.label ??
    'Conoscenza autentica'
  )
}

function sharedInterests(profile: Profile, viewer: OwnProfile) {
  const viewerInterests = viewer.interests.map((interest) =>
    interest.toLowerCase(),
  )

  return profile.tags.filter((tag) =>
    viewerInterests.some(
      (interest) =>
        interest.includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(interest),
    ),
  )
}

function compatibilityScore(
  profile: Profile,
  viewer: OwnProfile,
  activeSection: SectionKey,
) {
  let score = 54

  if (profile.sections.includes(activeSection)) {
    score += 10
  }

  if (viewer.relationshipGoal && profile.relationshipGoal === viewer.relationshipGoal) {
    score += 14
  }

  score += Math.min(sharedInterests(profile, viewer).length * 8, 16)

  const ageGap = Math.abs(profile.age - (viewer.age || profile.age))
  score += ageGap <= 3 ? 8 : ageGap <= 7 ? 4 : 0

  if (profile.distance <= 5) {
    score += 6
  }

  if (profile.availableToday) {
    score += 4
  }

  return Math.max(48, Math.min(score, 98))
}

function compatibilityReasons(
  profile: Profile,
  viewer: OwnProfile,
  activeSection: SectionKey,
) {
  const reasons: string[] = []
  const shared = sharedInterests(profile, viewer)

  if (shared.length) {
    reasons.push(`Interesse comune: ${shared[0]}`)
  }

  if (viewer.relationshipGoal && profile.relationshipGoal === viewer.relationshipGoal) {
    reasons.push('Stessa intenzione')
  }

  if (profile.sections.includes(activeSection)) {
    reasons.push(`Sezione ${SECTION_META[activeSection].label.toLowerCase()}`)
  }

  if (profile.distance <= 5) {
    reasons.push('Vicini')
  }

  if (profile.availableToday) {
    reasons.push('Disponibile oggi')
  }

  return reasons.slice(0, 3)
}

function validateEmailAuthRequest(request: EmailAuthRequest) {
  const email = request.email.trim()

  if (!email || !email.includes('@')) {
    return 'Inserisci una email valida.'
  }

  if (request.password.length < 6) {
    return 'La password deve avere almeno 6 caratteri.'
  }

  return null
}

function validateOnboardingDraft(draft: OnboardingDraft, step?: number) {
  const age = calculateAge(draft.birthDate)
  const checks = [
    () =>
      draft.inviteCode.trim()
        ? null
        : 'Inserisci un codice invito per entrare.',
    () =>
      draft.firstName.trim() && draft.lastName.trim()
        ? null
        : 'Nome e cognome sono obbligatori.',
    () =>
      normalizeUsername(draft.username).length >= 3
        ? null
        : 'Scegli uno username di almeno 3 caratteri.',
    () =>
      age >= 18 ? null : 'Accesso consentito solo a persone maggiorenni.',
    () => (draft.city.trim() ? null : 'Inserisci la tua citta.'),
    () =>
      draft.gender && draft.relationshipGoal
        ? null
        : 'Completa identita e obiettivo.',
    () =>
      parseInterests(draft.interests).length >= 2
        ? null
        : 'Inserisci almeno due interessi separati da virgola.',
    () =>
      draft.bio.trim().length >= 20 && draft.availability.trim()
        ? null
        : 'Scrivi una bio breve e la tua disponibilita.',
    () =>
      draft.accepted && draft.sections.length
        ? null
        : 'Conferma regole e scegli almeno una sezione.',
  ]

  if (typeof step === 'number') {
    return checks[step]?.() ?? null
  }

  for (const check of checks) {
    const error = check()

    if (error) {
      return error
    }
  }

  return null
}

function App() {
  const [session, setSession] = useStoredState<Session | null>(
    STORAGE.session,
    null,
  )
  const [ownProfile, setOwnProfile] = useStoredState<OwnProfile>(
    STORAGE.profile,
    EMPTY_PROFILE,
  )
  const [invites, setInvites] = useStoredState<Invite[]>(STORAGE.invites, [])
  const [likedIds, setLikedIds] = useStoredState<string[]>(STORAGE.likes, [])
  const [passedIds, setPassedIds] = useStoredState<string[]>(STORAGE.passes, [])
  const [matchedIds, setMatchedIds] = useStoredState<string[]>(
    STORAGE.matches,
    [],
  )
  const [messages, setMessages] = useStoredState<Record<string, Message[]>>(
    STORAGE.messages,
    {},
  )
  const [nightAccepted, setNightAccepted] = useStoredState<boolean>(
    STORAGE.nightAccepted,
    false,
  )

  const [remoteState, setRemoteState] =
    useState<RemoteState>(REMOTE_STATE_EMPTY)
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    session?.userId ?? null,
  )
  const [authEmail, setAuthEmail] = useState(session?.email ?? '')
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>('network')
  const [activeView, setActiveView] = useState<ViewKey>('discover')
  const [query, setQuery] = useState('')
  const [maxDistance, setMaxDistance] = useState(25)
  const [minAge, setMinAge] = useState(24)
  const [maxAge, setMaxAge] = useState(45)
  const [intentFilter, setIntentFilter] = useState('all')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [invitePurpose, setInvitePurpose] = useState('Nuovo invito privato')
  const [profileSaving, setProfileSaving] = useState(false)
  const [disclaimerKey, setDisclaimerKey] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [launchOpen, setLaunchOpen] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [showNightReminder, setShowNightReminder] = useState(false)
  const nightReminderTimerRef = useRef<number | null>(null)

  const refreshRemoteData = useCallback(
    async (userId: string, viewerCity = ownProfile.city) => {
      if (!supabase) {
        return
      }

      setRemoteLoading(true)

      try {
        const [profilesResult, likesResult, matchesResult, invitesResult] =
          await Promise.all([
            supabase
              .from('profiles')
              .select(PROFILE_SELECT)
              .neq('id', userId),
            supabase
              .from('likes')
              .select('from_profile, to_profile, section')
              .or(`from_profile.eq.${userId},to_profile.eq.${userId}`),
            supabase
              .from('matches')
              .select('id, profile_a, profile_b, section, created_at')
              .or(`profile_a.eq.${userId},profile_b.eq.${userId}`)
              .order('created_at', { ascending: false }),
            supabase
              .from('invites')
              .select('id, code, purpose, created_at, used_by, used_at, created_by')
              .or(`created_by.eq.${userId},used_by.eq.${userId}`)
              .order('created_at', { ascending: false }),
          ])

        if (
          profilesResult.error ||
          likesResult.error ||
          matchesResult.error ||
          invitesResult.error
        ) {
          throw (
            profilesResult.error ??
            likesResult.error ??
            matchesResult.error ??
            invitesResult.error
          )
        }

        const likesRows = (likesResult.data ?? []) as RemoteLikeRow[]
        const matchRows = (matchesResult.data ?? []) as RemoteMatchRow[]
        const likedByIds = new Set(
          likesRows
            .filter((like) => like.to_profile === userId)
            .map((like) => like.from_profile),
        )
        const savedLikedIds = likesRows
          .filter((like) => like.from_profile === userId)
          .map((like) => like.to_profile)
        const matchByProfileId = matchRows.reduce<Record<string, string>>(
          (matchesByProfile, match) => {
            const otherProfile =
              match.profile_a === userId ? match.profile_b : match.profile_a
            matchesByProfile[otherProfile] = match.id
            return matchesByProfile
          },
          {},
        )
        const remoteProfiles = ((profilesResult.data ?? []) as RemoteProfileRow[])
          .map((row) => rowToProfile(row, viewerCity, likedByIds, matchByProfileId))
          .sort((a, b) => a.distance - b.distance)
        const remoteInvites = ((invitesResult.data ?? []) as RemoteInviteRow[]).map(
          (invite) => ({
            id: invite.id,
            code: invite.code,
            purpose: invite.purpose,
            createdAt: formatShortDate(invite.created_at),
            used: Boolean(invite.used_by),
            createdBy: invite.created_by,
            usedBy: invite.used_by,
          }),
        )
        const matchIds = matchRows.map((match) => match.id)
        const messageMap: Record<string, Message[]> = {}

        if (matchIds.length) {
          const messagesResult = await supabase
            .from('messages')
            .select('id, match_id, sender_id, body, created_at')
            .in('match_id', matchIds)
            .order('created_at', { ascending: true })

          if (messagesResult.error) {
            throw messagesResult.error
          }

          ;((messagesResult.data ?? []) as RemoteMessageRow[]).forEach(
            (message) => {
              messageMap[message.match_id] = [
                ...(messageMap[message.match_id] ?? []),
                {
                  id: message.id,
                  from: message.sender_id === userId ? 'me' : 'them',
                  text: message.body,
                  time: nowTime(new Date(message.created_at)),
                },
              ]
            },
          )
        }

        setRemoteState({
          profiles: remoteProfiles,
          likedIds: savedLikedIds,
          matchedIds: Object.keys(matchByProfileId),
          invites: remoteInvites,
          messages: messageMap,
          matchByProfileId,
        })
      } catch (error) {
        console.error(error)
        setNotice('Non riesco a caricare i dati in questo momento.')
      } finally {
        setRemoteLoading(false)
      }
    },
    [ownProfile.city],
  )

  const loadAccount = useCallback(
    async (userId: string, email = '') => {
      if (!supabase) {
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error(error)
        return
      }

      setCurrentUserId(userId)
      setAuthEmail(email)

      if (!data) {
        setSession(null)
        setOnboardingUserId(userId)
        return
      }

      const profile = rowToOwnProfile(data as RemoteProfileRow)
      setOwnProfile(profile)
      setSession(ownProfileToSession(profile, 'EMAIL', userId, email))
      setOnboardingUserId(null)
      await refreshRemoteData(userId, profile.city)
    },
    [refreshRemoteData, setOwnProfile, setSession],
  )

  useEffect(() => {
    let cancelled = false

    async function restoreSupabaseSession() {
      if (!supabase) {
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (cancelled || error) {
        return
      }

      const user = data.session?.user

      if (user) {
        await loadAccount(user.id, user.email ?? '')
      }
    }

    void restoreSupabaseSession()

    const authListener = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      const user = nextSession?.user

      if (user) {
        void loadAccount(user.id, user.email ?? '')
        return
      }

      setCurrentUserId(null)
      setRemoteState(REMOTE_STATE_EMPTY)
    })

    return () => {
      cancelled = true
      authListener?.data.subscription.unsubscribe()
    }
  }, [loadAccount])

  useEffect(() => {
    async function loadDisclaimerKey() {
      const today = new Date().toISOString().slice(0, 10)
      let key = `cerchiami-${today}`

      try {
        const response = await fetch('/api/disclaimer-key')

        if (response.ok) {
          const payload = (await response.json()) as { key?: string }
          key = payload.key || key
        }
      } catch {
        key = `cerchiami-local-${today}`
      }

      setDisclaimerKey(key)
      setShowDisclaimer(window.localStorage.getItem(`disclaimer:${key}`) !== 'ok')
    }

    void loadDisclaimerKey()
  }, [])

  useEffect(() => {
    const isLegacyDemoId = (id: string) => LEGACY_DEMO_PROFILE_IDS.includes(id)

    setLikedIds((current) => current.filter((id) => !isLegacyDemoId(id)))
    setPassedIds((current) => current.filter((id) => !isLegacyDemoId(id)))
    setMatchedIds((current) => current.filter((id) => !isLegacyDemoId(id)))
    setMessages((current) => {
      const nextMessages = { ...current }

      LEGACY_DEMO_PROFILE_IDS.forEach((id) => {
        delete nextMessages[id]
      })

      return nextMessages
    })
  }, [setLikedIds, setMatchedIds, setMessages, setPassedIds])

  useEffect(() => {
    return () => {
      if (nightReminderTimerRef.current) {
        window.clearTimeout(nightReminderTimerRef.current)
      }
    }
  }, [])

  const allProfiles = remoteState.profiles
  const allProfileIds = useMemo(
    () => new Set(allProfiles.map((profile) => profile.id)),
    [allProfiles],
  )
  const effectiveLikedIds = unique([...likedIds, ...remoteState.likedIds]).filter(
    (id) => allProfileIds.has(id),
  )
  const effectiveMatchedIds = unique([
    ...matchedIds,
    ...remoteState.matchedIds,
  ]).filter((id) => allProfileIds.has(id))
  const visibleProfiles = useMemo(
    () =>
      allProfiles.filter((profile) => {
        const matchesSection = profile.sections.includes(activeSection)
        const matchesQuery =
          !query.trim() ||
          `${profile.name} ${profile.city} ${profile.role} ${profile.bio} ${profile.tags.join(' ')} ${profile.values.join(' ')} ${profile.dateIdea}`
            .toLowerCase()
            .includes(query.toLowerCase())
        const matchesIntent =
          intentFilter === 'all' || profile.relationshipGoal === intentFilter

        return (
          matchesSection &&
          matchesQuery &&
          matchesIntent &&
          profile.age >= minAge &&
          profile.age <= maxAge &&
          profile.distance <= maxDistance &&
          (!availableOnly || profile.availableToday)
        )
      }),
    [
      activeSection,
      allProfiles,
      availableOnly,
      intentFilter,
      maxAge,
      maxDistance,
      minAge,
      query,
    ],
  )
  const compatibleProfiles = useMemo(
    () =>
      [...visibleProfiles].sort(
        (a, b) =>
          compatibilityScore(b, ownProfile, activeSection) -
          compatibilityScore(a, ownProfile, activeSection),
      ),
    [activeSection, ownProfile, visibleProfiles],
  )
  const matchProfiles = allProfiles.filter(
    (profile) =>
      effectiveMatchedIds.includes(profile.id) ||
      (effectiveLikedIds.includes(profile.id) && profile.likedYou),
  )
  const selectedMatch =
    matchProfiles.find((profile) => profile.id === selectedMatchId) ??
    matchProfiles[0] ??
    null
  const selectedRemoteMatchId = selectedMatch
    ? selectedMatch.matchId ?? remoteState.matchByProfileId[selectedMatch.id]
    : undefined
  const currentMessages = selectedMatch
    ? selectedMatch.source === 'remote' && selectedRemoteMatchId
      ? remoteState.messages[selectedRemoteMatchId] ?? []
      : messages[selectedMatch.id] ?? []
    : []
  const spotlightProfiles =
    activeView === 'discover'
      ? compatibleProfiles.slice(0, 3)
      : visibleProfiles.slice(0, 3)
  const spotlightImages = spotlightProfiles.length
    ? spotlightProfiles.map((profile) => profile.image)
    : GROUP_IMAGE_POOL.slice(0, 3)
  const topSuggestion = compatibleProfiles[0] ?? visibleProfiles[0] ?? null
  const screenCopy: Record<ViewKey, { title: string; body: string }> = {
    discover: {
      title: 'Persone per oggi',
      body: 'Pochi profili, contesto chiaro e motivi reali per iniziare una conversazione.',
    },
    matches: {
      title: 'Match e conversazioni',
      body: "Scegli una persona e scrivi quando c'e davvero interesse.",
    },
    invites: {
      title: 'Inviti privati',
      body: "Crea codici semplici per far entrare persone fidate nella tua cerchia.",
    },
    profile: {
      title: 'Il tuo profilo',
      body: 'Aggiorna come ti presenti, cosa cerchi e quando sei disponibile.',
    },
  }

  async function saveProfileToSupabase(userId: string, profile: OwnProfile) {
    if (!supabase) {
      throw new Error('Accesso non disponibile')
    }

    const payload = {
      id: userId,
      first_name: profile.firstName.trim(),
      last_name: profile.lastName.trim(),
      username: normalizeUsername(profile.username),
      birth_date: profile.birthDate || null,
      gender: profile.gender,
      relationship_goal: profile.relationshipGoal,
      interests: profile.interests,
      display_name: profile.displayName.trim(),
      age: profile.age,
      city: profile.city.trim(),
      bio: profile.bio.trim(),
      availability: profile.availability.trim(),
      sections: profile.sections,
      visibility: profile.visibility,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('profiles').upsert(payload)

    if (error) {
      throw error
    }
  }

  async function claimInvite(code: string, userId: string) {
    if (BASE_INVITES.includes(code)) {
      return { ok: true }
    }

    if (!supabase) {
      return { ok: false, message: 'Accesso non disponibile in questo momento.' }
    }

    const { data, error } = await supabase
      .from('invites')
      .select('id, used_by')
      .eq('code', code)
      .maybeSingle()

    if (error || !data) {
      return { ok: false, message: 'Codice invito non valido.' }
    }

    const invite = data as { id: string; used_by: string | null }

    if (invite.used_by && invite.used_by !== userId) {
      return { ok: false, message: 'Codice invito gia utilizzato.' }
    }

    const { error: updateError } = await supabase
      .from('invites')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (updateError) {
      return { ok: false, message: 'Codice invito non confermato.' }
    }

    return { ok: true }
  }

  async function handleEmailAuth(request: EmailAuthRequest) {
    const validationError = validateEmailAuthRequest(request)

    if (validationError) {
      return validationError
    }

    if (!supabase) {
      return 'Accesso non disponibile in questo momento. Riprova piu tardi.'
    }

    const email = request.email.trim()
    setAuthEmail(email)

    try {
      const { data, error } =
        request.mode === 'signup'
          ? await supabase.auth.signUp({
              email,
              password: request.password,
            })
          : await supabase.auth.signInWithPassword({
              email,
              password: request.password,
            })

      if (error) {
        return /captcha/i.test(error.message)
          ? 'Registrazione temporaneamente non disponibile. Riprova piu tardi.'
          : error.message
      }

      const user = data.session?.user ?? data.user

      if (!data.session || !user) {
        return 'Account creato: conferma la email, poi entra con la stessa password.'
      }

      await loadAccount(user.id, user.email ?? email)
      return null
    } catch (error) {
      console.error(error)
      return 'Accesso non completato.'
    }
  }

  async function handleOnboardingSubmit(draft: OnboardingDraft) {
    const validationError = validateOnboardingDraft(draft)
    const userId = onboardingUserId ?? currentUserId

    if (validationError) {
      return validationError
    }

    if (!userId) {
      return 'Sessione scaduta: rifai il login email.'
    }

    const normalizedCode = draft.inviteCode.trim().toUpperCase()
    const inviteResult = await claimInvite(normalizedCode, userId)

    if (!inviteResult.ok) {
      return inviteResult.message ?? 'Codice invito non valido.'
    }

    const profile: OwnProfile = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      username: normalizeUsername(draft.username),
      birthDate: draft.birthDate,
      gender: draft.gender,
      relationshipGoal: draft.relationshipGoal,
      interests: parseInterests(draft.interests),
      displayName: draft.username.trim() || draft.firstName.trim(),
      age: calculateAge(draft.birthDate),
      city: draft.city.trim(),
      bio: draft.bio.trim(),
      availability: draft.availability.trim(),
      sections: draft.sections,
      visibility: draft.visibility,
    }

    try {
      await saveProfileToSupabase(userId, profile)
      setOwnProfile(profile)
      setSession(ownProfileToSession(profile, normalizedCode, userId, authEmail))
      setCurrentUserId(userId)
      setOnboardingUserId(null)
      setNotice('Profilo completato.')
      await refreshRemoteData(userId, profile.city)
      return null
    } catch (error) {
      console.error(error)
      return 'Profilo non salvato. Riprova tra poco.'
    }
  }

  function acceptDisclaimer() {
    if (disclaimerKey) {
      window.localStorage.setItem(`disclaimer:${disclaimerKey}`, 'ok')
    }

    setShowDisclaimer(false)
  }

  async function logout() {
    await supabase?.auth.signOut()
    setSession(null)
    setCurrentUserId(null)
    setOnboardingUserId(null)
    setRemoteState(REMOTE_STATE_EMPTY)
    setShowNightReminder(false)
    setLaunchOpen(false)
  }

  function showTemporaryNightReminder() {
    if (nightAccepted) {
      return
    }

    if (nightReminderTimerRef.current) {
      window.clearTimeout(nightReminderTimerRef.current)
    }

    setShowNightReminder(true)
    nightReminderTimerRef.current = window.setTimeout(() => {
      setShowNightReminder(false)
      setNightAccepted(true)
      nightReminderTimerRef.current = null
    }, 4200)
  }

  async function likeProfile(profile: Profile) {
    if (profile.source === 'remote' && currentUserId && supabase) {
      try {
        const targetSection = profile.sections.includes(activeSection)
          ? activeSection
          : profile.sections[0]
        const { data, error } = await supabase.rpc('like_profile', {
          target_profile: profile.id,
          target_section: targetSection,
        })

        if (error) {
          throw error
        }

        const matchId = Array.isArray(data)
          ? (data[0] as { match_id: string | null } | undefined)?.match_id
          : null

        setRemoteState((current) => ({
          ...current,
          likedIds: unique([...current.likedIds, profile.id]),
          matchedIds: matchId
            ? unique([...current.matchedIds, profile.id])
            : current.matchedIds,
          matchByProfileId: matchId
            ? { ...current.matchByProfileId, [profile.id]: matchId }
            : current.matchByProfileId,
        }))
        setNotice(matchId ? `Match con ${profile.name}.` : `Interesse salvato per ${profile.name}.`)
        await refreshRemoteData(currentUserId)
      } catch (error) {
        console.error(error)
        setNotice('Non riesco a salvare questo interesse adesso.')
      }

      return
    }

    setLikedIds((current) => unique([...current, profile.id]))

    if (profile.likedYou) {
      setMatchedIds((current) => unique([...current, profile.id]))
      setSelectedMatchId(profile.id)
      setActiveView('matches')
      setMessages((current) => ({
        ...current,
        [profile.id]: current[profile.id] ?? [
          {
            id: `${profile.id}-hello`,
            from: 'them',
            text: `Ciao, sono ${profile.name}. Mi fa piacere il match.`,
            time: nowTime(),
          },
        ],
      }))
      setNotice(`Match con ${profile.name}.`)
    } else {
      setNotice(`Interesse salvato per ${profile.name}.`)
    }
  }

  function passProfile(profile: Profile) {
    setPassedIds((current) => unique([...current, profile.id]))
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedMatch || !draftMessage.trim()) {
      return
    }

    const text = draftMessage.trim()
    setDraftMessage('')

    if (
      selectedMatch.source === 'remote' &&
      selectedRemoteMatchId &&
      currentUserId &&
      supabase
    ) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: selectedRemoteMatchId,
          sender_id: currentUserId,
          body: text,
        })
        .select('id, created_at')
        .single()

      if (error) {
        console.error(error)
        setNotice('Messaggio non inviato. Riprova tra poco.')
        return
      }

      const row = data as { id: string; created_at: string }
      setRemoteState((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [selectedRemoteMatchId]: [
            ...(current.messages[selectedRemoteMatchId] ?? []),
            {
              id: row.id,
              from: 'me',
              text,
              time: nowTime(new Date(row.created_at)),
            },
          ],
        },
      }))
      return
    }

    setMessages((current) => ({
      ...current,
      [selectedMatch.id]: [
        ...(current[selectedMatch.id] ?? []),
        { id: `${selectedMatch.id}-${Date.now()}`, from: 'me', text, time: nowTime() },
      ],
    }))
  }

  async function createInvite() {
    const code = makeInviteCode()
    const purpose = invitePurpose.trim() || 'Nuovo invito privato'

    if (supabase && currentUserId) {
      const { data, error } = await supabase
        .from('invites')
        .insert({ code, purpose, created_by: currentUserId })
        .select('id, code, purpose, created_at, used_by, created_by')
        .single()

      if (error) {
        console.error(error)
        setNotice('Invito non creato. Riprova tra poco.')
        return
      }

      const row = data as RemoteInviteRow
      setRemoteState((current) => ({
        ...current,
        invites: [
          {
            id: row.id,
            code: row.code,
            purpose: row.purpose,
            createdAt: formatShortDate(row.created_at),
            used: Boolean(row.used_by),
            createdBy: row.created_by,
            usedBy: row.used_by,
          },
          ...current.invites,
        ],
      }))
    } else {
      setInvites((current) => [
        {
          code,
          purpose,
          createdAt: formatShortDate(new Date()),
          used: false,
        },
        ...current,
      ])
    }

    setInvitePurpose('Nuovo invito privato')
    setNotice(`Invito creato: ${code}`)
  }

  async function copyInvite(code: string) {
    await navigator.clipboard.writeText(code)
    setNotice(`Codice copiato: ${code}`)
  }

  async function saveOwnProfile() {
    if (!session) {
      return
    }

    const profileToSave = {
      ...ownProfile,
      username: normalizeUsername(ownProfile.username),
      displayName: ownProfile.displayName.trim() || session.name,
      city: ownProfile.city.trim() || session.city,
    }

    setProfileSaving(true)

    try {
      if (currentUserId) {
        await saveProfileToSupabase(currentUserId, profileToSave)
        await refreshRemoteData(currentUserId, profileToSave.city)
      }

      setOwnProfile(profileToSave)
      setSession({
        ...session,
        name: profileToSave.displayName,
        city: profileToSave.city,
        age: profileToSave.age,
      })
      setNotice('Profilo salvato.')
    } catch (error) {
      console.error(error)
      setNotice('Profilo non salvato. Riprova tra poco.')
    } finally {
      setProfileSaving(false)
    }
  }

  if (!launchOpen) {
    return <LaunchScreen onStart={() => setLaunchOpen(true)} />
  }

  if (!session) {
    return (
      <>
        {onboardingUserId ? (
          <OnboardingFlow
            initialEmail={authEmail}
            onSubmit={handleOnboardingSubmit}
          />
        ) : (
          <EmailAccess onSubmit={handleEmailAuth} />
        )}
        {showDisclaimer && <DisclaimerModal onAccept={acceptDisclaimer} />}
      </>
    )
  }

  return (
    <main className={`app-shell section-${activeSection}`}>
      <AmbientScene activeSection={activeSection} />

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>
      )}

      <header className="app-topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Users size={21} />
          </div>
          <div>
            <h1 className="wordmark">
              <span>Cerchia</span>
              <span>Mi</span>
            </h1>
            <p>
              {session.city} · {session.age} anni
            </p>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="icon-button"
            onClick={logout}
            aria-label="Esci"
            title="Esci"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="section-rail" aria-label="Sezioni">
        {Object.values(SECTION_META).map(({ key, label, Icon }) => (
          <button
            type="button"
            key={key}
            className={activeSection === key ? 'is-active' : ''}
            onClick={() => {
              setActiveSection(key)
              setActiveView('discover')
              if (key === 'night') {
                showTemporaryNightReminder()
              }
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <PrimaryNav
        className="desktop-nav"
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="mood-chips" aria-label="Filtri rapidi">
        <button
          type="button"
          className={availableOnly ? 'is-active' : ''}
          onClick={() => setAvailableOnly((current) => !current)}
        >
          <Calendar size={17} />
          Oggi
        </button>
        <button
          type="button"
          className={maxDistance <= 5 ? 'is-active' : ''}
          onClick={() => setMaxDistance(maxDistance <= 5 ? 25 : 5)}
        >
          <MapPin size={17} />
          Vicini
        </button>
        <button
          type="button"
          className={query.toLowerCase() === 'musica' ? 'is-active' : ''}
          onClick={() =>
            setQuery((current) =>
              current.toLowerCase() === 'musica' ? '' : 'musica',
            )
          }
        >
          <MessageCircle size={17} />
          Musica
        </button>
        <button
          type="button"
          className={query.toLowerCase() === 'viaggi' ? 'is-active' : ''}
          onClick={() =>
            setQuery((current) =>
              current.toLowerCase() === 'viaggi' ? '' : 'viaggi',
            )
          }
        >
          <Sparkles size={17} />
          Viaggi
        </button>
      </div>

      <div className="app-stage">
        <section className="main-pane">
          <section className="daily-hero" aria-labelledby="screen-title">
            <div className="daily-copy">
              <h2 id="screen-title">{screenCopy[activeView].title}</h2>
              <p>{screenCopy[activeView].body}</p>
              {topSuggestion && activeView !== 'profile' && (
                <div className="today-suggestion">
                  <Sparkles size={17} />
                  <span>
                    {topSuggestion.name}:{' '}
                    {compatibilityScore(topSuggestion, ownProfile, activeSection)}
                    % compatibile
                  </span>
                </div>
              )}
            </div>

            <div className="quick-stats" aria-label="Riepilogo">
              <div>
                <strong>{visibleProfiles.length}</strong>
                <span>profili</span>
              </div>
              <div>
                <strong>{matchProfiles.length}</strong>
                <span>match</span>
              </div>
              <div>
                <strong>{effectiveLikedIds.length}</strong>
                <span>interessi</span>
              </div>
            </div>

            <div className="hero-photo-strip" aria-hidden="true">
              {spotlightImages.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt=""
                    className={index === 0 ? 'is-main' : ''}
                  />
                ))}
            </div>
          </section>

          {activeView === 'discover' && (
            <>
              <div className="filters">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca interessi, citta, nome"
                  />
                </label>

                <label className="distance-field">
                  <SlidersHorizontal size={18} />
                  <span>{maxDistance} km</span>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={maxDistance}
                    onChange={(event) => setMaxDistance(Number(event.target.value))}
                  />
                </label>

                <label className="select-field">
                  Intenzione
                  <select
                    value={intentFilter}
                    onChange={(event) => setIntentFilter(event.target.value)}
                  >
                    <option value="all">Tutte</option>
                    {RELATIONSHIP_GOALS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="age-field">
                  Eta
                  <span>
                    <input
                      type="number"
                      min="18"
                      max="80"
                      value={minAge}
                      onChange={(event) =>
                        setMinAge(Math.min(Number(event.target.value), maxAge))
                      }
                    />
                    <input
                      type="number"
                      min="18"
                      max="80"
                      value={maxAge}
                      onChange={(event) =>
                        setMaxAge(Math.max(Number(event.target.value), minAge))
                      }
                    />
                  </span>
                </label>

                <label className="toggle-pill">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) => setAvailableOnly(event.target.checked)}
                  />
                  Oggi
                </label>
              </div>

              <ProfileGrid
                profiles={compatibleProfiles}
                isLoading={remoteLoading}
                viewerProfile={ownProfile}
                activeSection={activeSection}
                likedIds={effectiveLikedIds}
                passedIds={passedIds}
                matchedIds={effectiveMatchedIds}
                onLike={likeProfile}
                onPass={passProfile}
                onOpenInvites={() => setActiveView('invites')}
                onOpenProfile={() => setActiveView('profile')}
              />
            </>
          )}

          {activeView === 'matches' && (
            <section className="match-board">
              <MatchesView
                profiles={matchProfiles}
                selectedId={selectedMatch?.id ?? null}
                setSelectedId={setSelectedMatchId}
              />
              <ChatPanel
                selectedMatch={selectedMatch}
                messages={currentMessages}
                draftMessage={draftMessage}
                setDraftMessage={setDraftMessage}
                sendMessage={sendMessage}
              />
            </section>
          )}

          {activeView === 'invites' && (
            <InviteManager
              invites={[...remoteState.invites, ...invites]}
              invitePurpose={invitePurpose}
              setInvitePurpose={setInvitePurpose}
              createInvite={createInvite}
              copyInvite={copyInvite}
            />
          )}

          {activeView === 'profile' && (
            <OwnProfileEditor
              profile={ownProfile}
              setProfile={setOwnProfile}
              session={session}
              onSave={saveOwnProfile}
              saving={profileSaving}
            />
          )}
        </section>
      </div>

      <PrimaryNav
        className="bottom-nav"
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {showDisclaimer && <DisclaimerModal onAccept={acceptDisclaimer} />}
      {showNightReminder && (
        <NightReminder
          onClose={() => {
            if (nightReminderTimerRef.current) {
              window.clearTimeout(nightReminderTimerRef.current)
              nightReminderTimerRef.current = null
            }
            setShowNightReminder(false)
            setNightAccepted(true)
          }}
        />
      )}
    </main>
  )
}

function PrimaryNav({
  activeView,
  setActiveView,
  className,
}: {
  activeView: ViewKey
  setActiveView: Dispatch<SetStateAction<ViewKey>>
  className: string
}) {
  return (
    <nav className={className} aria-label="Navigazione principale">
      {PRIMARY_NAV_ITEMS.map(({ key, label, Icon }) => (
        <button
          type="button"
          key={key}
          className={activeView === key ? 'is-active' : ''}
          onClick={() => setActiveView(key)}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function AmbientScene({ activeSection }: { activeSection: SectionKey }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    let disposed = false
    let cleanupScene: (() => void) | null = null

    if (!canvas) {
      return
    }

    void import('three').then((THREE) => {
      if (disposed) {
        return
      }

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const palette = {
        network: { primary: '#087e75', secondary: '#ff5348' },
        relationship: { primary: '#d94f66', secondary: '#23d0b0' },
        night: { primary: '#5c54d8', secondary: '#ff5348' },
      }[activeSection]
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        preserveDrawingBuffer: true,
      })
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      const group = new THREE.Group()

      renderer.setClearAlpha(0)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
      camera.position.set(0, 0, 8)
      scene.add(group)

      const knotGeometry = new THREE.TorusKnotGeometry(1.16, 0.14, 132, 12)
      const knotMaterial = new THREE.MeshBasicMaterial({
        color: palette.primary,
        opacity: 0.18,
        transparent: true,
        wireframe: true,
      })
      const knot = new THREE.Mesh(knotGeometry, knotMaterial)
      knot.position.set(2.7, 1.05, 0)
      knot.rotation.set(0.55, 0.38, 0.08)

      const ringGeometry = new THREE.TorusGeometry(2.05, 0.018, 10, 128)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: palette.secondary,
        opacity: 0.18,
        transparent: true,
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.position.set(-2.8, -1.45, -0.8)
      ring.rotation.set(1.22, 0.42, -0.28)

      const planeGeometry = new THREE.IcosahedronGeometry(0.82, 1)
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: '#172320',
        opacity: 0.07,
        transparent: true,
        wireframe: true,
      })
      const shard = new THREE.Mesh(planeGeometry, planeMaterial)
      shard.position.set(0.35, -0.08, -1.2)
      shard.rotation.set(0.6, 0.4, 0.1)

      const pointGeometry = new THREE.BufferGeometry()
      const positions: number[] = []

      for (let index = 0; index < 120; index += 1) {
        const angle = index * 0.38
        const radius = 2.2 + Math.sin(index * 0.37) * 0.55
        positions.push(
          Math.cos(angle) * radius,
          Math.sin(angle * 0.82) * 1.15,
          -1.6 + Math.sin(index * 0.19) * 0.6,
        )
      }

      pointGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3),
      )

      const pointMaterial = new THREE.PointsMaterial({
        color: '#172320',
        opacity: 0.18,
        size: 0.025,
        transparent: true,
      })
      const points = new THREE.Points(pointGeometry, pointMaterial)
      points.position.set(0.1, 0.05, -1.5)

      group.add(knot, ring, shard, points)

      function resize() {
        const { innerWidth, innerHeight } = window

        renderer.setSize(innerWidth, innerHeight, false)
        camera.aspect = innerWidth / innerHeight
        camera.updateProjectionMatrix()
      }

      let frame = 0
      let raf = 0

      function render() {
        frame += 1

        if (!reduceMotion) {
          knot.rotation.x += 0.0026
          knot.rotation.y += 0.0034
          ring.rotation.z -= 0.0018
          shard.rotation.x -= 0.0016
          points.rotation.z += 0.0009
          group.position.y = Math.sin(frame * 0.014) * 0.05
        }

        renderer.render(scene, camera)

        if (!reduceMotion) {
          raf = window.requestAnimationFrame(render)
        }
      }

      resize()
      render()
      window.addEventListener('resize', resize)

      cleanupScene = () => {
        window.removeEventListener('resize', resize)
        window.cancelAnimationFrame(raf)
        knotGeometry.dispose()
        ringGeometry.dispose()
        planeGeometry.dispose()
        pointGeometry.dispose()
        knotMaterial.dispose()
        ringMaterial.dispose()
        planeMaterial.dispose()
        pointMaterial.dispose()
        renderer.dispose()
      }
    })

    return () => {
      disposed = true
      cleanupScene?.()
    }
  }, [activeSection])

  return (
    <div className="ambient-scene" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}

function LaunchScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="launch-shell">
      <h1 className="sr-only">CerchiaMi</h1>
      <button type="button" className="launch-button" onClick={onStart}>
        <span className="launch-logo" aria-hidden="true">
          <Users size={34} />
        </span>
        <span className="launch-wordmark">
          <span>Cerchia</span>
          <span>Mi</span>
        </span>
        <span className="launch-hint">Tocca per iniziare</span>
      </button>
    </main>
  )
}

function EmailAccess({
  onSubmit,
}: {
  onSubmit: (request: EmailAuthRequest) => Promise<string | null>
}) {
  const [mode, setMode] = useState<EmailAuthRequest['mode']>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accepted) {
      setError('Accetta le regole base per continuare.')
      return
    }

    setSubmitting(true)
    setError('')

    const result = await onSubmit({ mode, email, password })

    if (result) {
      setError(result)
    }

    setSubmitting(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            <AtSign size={22} />
          </div>
          <div>
            <p className="eyebrow">Accesso riservato</p>
            <h1 id="auth-title" className="wordmark">
              <span>Cerchia</span>
              <span>Mi</span>
            </h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-mode" role="tablist" aria-label="Tipo accesso">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => setMode('login')}
            >
              Entra
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => setMode('signup')}
            >
              Crea account
            </button>
          </div>

          <label>
            Email
            <input
              value={email}
              type="email"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@email.it"
            />
          </label>

          <label>
            Password
            <input
              value={password}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Almeno 6 caratteri"
            />
          </label>

          <div className="auth-note">
            <ShieldCheck size={16} />
            <span>Dopo l'accesso completi il profilo e usi il codice invito.</span>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              Confermo maggiore eta, rispetto, consenso e discrezione.
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={submitting}>
            <Lock size={18} />
            {submitting ? 'Attendi...' : mode === 'login' ? 'Entra' : 'Crea account'}
          </button>
        </form>
      </section>

      <section className="auth-preview" aria-label="Profili in evidenza">
        <div className="preview-photo is-large">
          <img src={GROUP_IMAGES.rooftop} alt="" />
          <span>Scopri</span>
        </div>
        <div className="preview-photo">
          <img src={GROUP_IMAGES.celebration} alt="" />
          <span>Relazione</span>
        </div>
        <div className="preview-photo is-small">
          <img src={GROUP_IMAGES.gaming} alt="" />
          <span>18+</span>
        </div>
      </section>
    </main>
  )
}

function OnboardingFlow({
  initialEmail,
  onSubmit,
}: {
  initialEmail: string
  onSubmit: (draft: OnboardingDraft) => Promise<string | null>
}) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState<OnboardingDraft>({
    inviteCode: '',
    firstName: '',
    lastName: '',
    username: '',
    birthDate: '',
    city: '',
    gender: '',
    relationshipGoal: '',
    interests: '',
    bio: '',
    availability: '',
    sections: ['network', 'relationship'],
    visibility: 'circle',
    accepted: false,
  })
  const steps = [
    'Invito',
    'Nome',
    'Username',
    'Nascita',
    'Citta',
    'Obiettivo',
    'Interessi',
    'Bio',
    'Regole',
  ]

  function updateDraft<K extends keyof OnboardingDraft>(
    key: K,
    value: OnboardingDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function toggleSection(section: SectionKey) {
    setDraft((current) => {
      const hasSection = current.sections.includes(section)
      const sections = hasSection
        ? current.sections.filter((item) => item !== section)
        : [...current.sections, section]

      return {
        ...current,
        sections: sections.length ? sections : current.sections,
      }
    })
  }

  function goNext() {
    const validationError = validateOnboardingDraft(draft, step)

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  async function submit() {
    setSubmitting(true)
    setError('')

    const result = await onSubmit(draft)

    if (result) {
      setError(result)
    }

    setSubmitting(false)
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-frame" aria-label="Crea profilo">
        <div className="onboarding-top">
          <div>
            <p className="eyebrow">Profilo · {initialEmail}</p>
            <h1>Costruisci il tuo spazio</h1>
          </div>
          <span className="distance">
            {step + 1}/{steps.length}
          </span>
        </div>

        <div className="step-track" aria-label="Avanzamento">
          {steps.map((label, index) => (
            <span
              key={label}
              className={
                index === step ? 'is-active' : index < step ? 'is-done' : ''
              }
            >
              {index + 1}
            </span>
          ))}
        </div>

        <div className="step-meter" aria-hidden="true">
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="onboarding-card" key={step}>
          {step === 0 && (
            <>
              <p className="eyebrow">Invito</p>
              <h2>Entra in CerchiaMi</h2>
              <label>
                Codice invito
                <input
                  value={draft.inviteCode}
                  onChange={(event) =>
                    updateDraft('inviteCode', event.target.value.toUpperCase())
                  }
                  placeholder="CERCHIAMI-2026"
                />
              </label>
              <p className="field-hint">
                Codice iniziale disponibile: CERCHIAMI-2026
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <p className="eyebrow">Identita</p>
              <h2>Nome e cognome</h2>
              <div className="form-grid">
                <label>
                  Nome
                  <input
                    value={draft.firstName}
                    onChange={(event) =>
                      updateDraft('firstName', event.target.value)
                    }
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Cognome
                  <input
                    value={draft.lastName}
                    onChange={(event) =>
                      updateDraft('lastName', event.target.value)
                    }
                    autoComplete="family-name"
                  />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="eyebrow">Pubblico</p>
              <h2>Soprannome</h2>
              <label>
                Username
                <input
                  value={draft.username}
                  onChange={(event) =>
                    updateDraft('username', normalizeUsername(event.target.value))
                  }
                  placeholder="mara.mi"
                  autoComplete="username"
                />
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <p className="eyebrow">Eta</p>
              <h2>Data di nascita</h2>
              <label>
                Data
                <input
                  value={draft.birthDate}
                  type="date"
                  onChange={(event) => updateDraft('birthDate', event.target.value)}
                />
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <p className="eyebrow">Zona</p>
              <h2>Dove vuoi conoscere persone</h2>
              <label>
                Citta
                <input
                  value={draft.city}
                  onChange={(event) => updateDraft('city', event.target.value)}
                  placeholder="Milano"
                  autoComplete="address-level2"
                />
              </label>
            </>
          )}

          {step === 5 && (
            <>
              <p className="eyebrow">Direzione</p>
              <h2>Chi sei e cosa cerchi</h2>
              <div className="form-grid">
                <label>
                  Mi identifico come
                  <select
                    value={draft.gender}
                    onChange={(event) => updateDraft('gender', event.target.value)}
                  >
                    <option value="">Scegli</option>
                    <option value="woman">Donna</option>
                    <option value="man">Uomo</option>
                    <option value="non-binary">Non binario</option>
                    <option value="private">Preferisco non dirlo</option>
                  </select>
                </label>
                <label>
                  Obiettivo
                  <select
                    value={draft.relationshipGoal}
                    onChange={(event) =>
                      updateDraft('relationshipGoal', event.target.value)
                    }
                  >
                    <option value="">Scegli</option>
                    {RELATIONSHIP_GOALS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <p className="eyebrow">Segnali</p>
              <h2>Interessi</h2>
              <label>
                Separati da virgola
                <input
                  value={draft.interests}
                  onChange={(event) => updateDraft('interests', event.target.value)}
                  placeholder="musica live, startup, cinema"
                />
              </label>
            </>
          )}

          {step === 7 && (
            <>
              <p className="eyebrow">Contesto</p>
              <h2>Bio e disponibilita</h2>
              <label>
                Bio
                <textarea
                  value={draft.bio}
                  onChange={(event) => updateDraft('bio', event.target.value)}
                  rows={4}
                  placeholder="Racconta in modo semplice come ti piace conoscere persone."
                />
              </label>
              <label>
                Disponibilita
                <input
                  value={draft.availability}
                  onChange={(event) =>
                    updateDraft('availability', event.target.value)
                  }
                  placeholder="Sere in settimana, weekend, pausa pranzo"
                />
              </label>
            </>
          )}

          {step === 8 && (
            <>
              <p className="eyebrow">Sezioni</p>
              <h2>Visibilita e regole</h2>
              <div className="choice-grid">
                {Object.values(SECTION_META).map(({ key, label, Icon }) => (
                  <button
                    type="button"
                    key={key}
                    className={draft.sections.includes(key) ? 'is-active' : ''}
                    onClick={() => toggleSection(key)}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
              <label>
                Visibilita
                <select
                  value={draft.visibility}
                  onChange={(event) =>
                    updateDraft(
                      'visibility',
                      event.target.value as OwnProfile['visibility'],
                    )
                  }
                >
                  <option value="circle">Cerchia privata</option>
                  <option value="matches">Solo match</option>
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={draft.accepted}
                  onChange={(event) => updateDraft('accepted', event.target.checked)}
                />
                <span>
                  Confermo maggiore eta, consenso e comportamento rispettoso.
                </span>
              </label>
            </>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="onboarding-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setError('')
              setStep((current) => Math.max(current - 1, 0))
            }}
            disabled={step === 0 || submitting}
          >
            Indietro
          </button>
          {step < steps.length - 1 ? (
            <button type="button" className="primary-button" onClick={goNext}>
              Avanti
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={submit}
              disabled={submitting}
            >
              <Check size={18} />
              {submitting ? 'Salvataggio...' : 'Completa'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

function DisclaimerModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="disclaimer-backdrop" role="presentation">
      <section
        className="disclaimer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
      >
        <div className="disclaimer-icon" aria-hidden="true">
          <ShieldCheck size={28} />
        </div>
        <div>
          <p className="eyebrow">Promemoria giornaliero</p>
          <h2 id="disclaimer-title">Rispetto prima di tutto</h2>
          <p>
            Usa CerchiaMi con educazione e buon senso. Evita pressioni,
            contenuti espliciti non richiesti, nudi o clip simili. Consenso,
            rispetto e discrezione restano la base.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={onAccept}>
          <Check size={18} />
          Ho capito
        </button>
      </section>
    </div>
  )
}

function NightReminder({ onClose }: { onClose: () => void }) {
  return (
    <aside className="night-reminder" role="status">
      <ShieldCheck size={18} />
      <div>
        <strong>Reminder 18+</strong>
        <span>Consenso, rispetto e limiti chiari.</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Chiudi reminder">
        <X size={16} />
      </button>
    </aside>
  )
}

function ProfileGrid({
  profiles,
  isLoading,
  viewerProfile,
  activeSection,
  likedIds,
  passedIds,
  matchedIds,
  onLike,
  onPass,
  onOpenInvites,
  onOpenProfile,
}: {
  profiles: Profile[]
  isLoading: boolean
  viewerProfile: OwnProfile
  activeSection: SectionKey
  likedIds: string[]
  passedIds: string[]
  matchedIds: string[]
  onLike: (profile: Profile) => void
  onPass: (profile: Profile) => void
  onOpenInvites: () => void
  onOpenProfile: () => void
}) {
  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (!profiles.length) {
    return (
      <EmptyState
        Icon={Search}
        title="Nessun profilo reale disponibile"
        description="Quando entrano persone reali nella tua cerchia, le vedrai qui. Nel frattempo puoi sistemare il profilo o invitare persone fidate."
        actions={[
          { label: 'Invita persone', Icon: KeyRound, onClick: onOpenInvites },
          { label: 'Completa profilo', Icon: User, onClick: onOpenProfile },
        ]}
      />
    )
  }

  return (
    <div className="profile-grid">
      {profiles.map((profile, index) => {
        const liked = likedIds.includes(profile.id)
        const passed = passedIds.includes(profile.id)
        const matched = matchedIds.includes(profile.id)
        const score = compatibilityScore(profile, viewerProfile, activeSection)
        const reasons = compatibilityReasons(profile, viewerProfile, activeSection)

        return (
          <article
            key={profile.id}
            className={`profile-card ${index === 0 ? 'is-featured' : ''} ${
              passed ? 'is-muted' : ''
            }`}
          >
            <div className="photo-frame">
              <img
                src={profile.image}
                alt={`Momento condiviso collegato a ${profile.name}`}
              />
              <span className="photo-count">{index + 1}/{profiles.length}</span>
              <span className="photo-save" aria-hidden="true">
                <Heart size={20} />
              </span>
              <div className="photo-identity">
                <span>
                  <strong>
                    {profile.name}, {profile.age}
                  </strong>
                  <small>
                    <MapPin size={15} />
                    {profile.city} · {profile.distance} km da te
                  </small>
                </span>
                <span
                  className="score-ring"
                  style={
                    {
                      '--score-angle': `${score * 3.6}deg`,
                    } as CSSProperties
                  }
                >
                  <strong>{score}%</strong>
                  <small>compat.</small>
                </span>
              </div>
              <div className="photo-badges">
                <span>
                  <Sparkles size={14} />
                  {score}%
                </span>
                {profile.verified && (
                  <span>
                    <BadgeCheck size={14} />
                    Verificato
                  </span>
                )}
                {profile.availableToday && (
                  <span>
                    <Clock size={14} />
                    Oggi
                  </span>
                )}
              </div>
            </div>

            <div className="profile-body">
              <div className="profile-title">
                <div>
                  <h3>
                    {profile.name}, {profile.age}
                  </h3>
                  <p>{relationshipGoalLabel(profile.relationshipGoal)}</p>
                </div>
                <span className="distance">
                  <MapPin size={14} />
                  {profile.distance} km
                </span>
              </div>

              <p className="profile-bio">{profile.bio}</p>

              <div className="match-insight">
                <strong>{score}% compatibili</strong>
                <span>
                  {reasons.length
                    ? reasons.join(' · ')
                    : 'Profilo coerente con le tue preferenze'}
                </span>
              </div>

              <div className="tag-row">
                {[...profile.tags, ...profile.values]
                  .slice(0, 5)
                  .map((tag, index) => (
                    <span key={`${tag}-${index}`}>{tag}</span>
                  ))}
              </div>

              <p className="profile-prompt">{profile.prompt}</p>

              <div className="mini-details">
                <span>
                  <Calendar size={15} />
                  {profile.dateIdea}
                </span>
                <span>{profile.intentNote}</span>
              </div>

              <div className="card-actions">
                <button
                  type="button"
                  className="icon-action"
                  onClick={() => onPass(profile)}
                  aria-label={`Passa ${profile.name}`}
                  title="Passa"
                >
                  <X size={20} />
                </button>
                <button
                  type="button"
                  className={`like-action ${liked ? 'is-liked' : ''}`}
                  onClick={() => onLike(profile)}
                >
                  <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                  {matched ? 'Match' : liked ? 'Salvato' : 'Mi interessa'}
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function MatchesView({
  profiles,
  selectedId,
  setSelectedId,
}: {
  profiles: Profile[]
  selectedId: string | null
  setSelectedId: Dispatch<SetStateAction<string | null>>
}) {
  if (!profiles.length) {
    return (
      <EmptyState
        Icon={Heart}
        title="Nessun match ancora"
        description="Quando tu e un'altra persona vi scegliete, la chat compare qui."
      />
    )
  }

  return (
    <div className="match-list">
      {profiles.map((profile) => (
        <button
          type="button"
          key={profile.id}
          className={profile.id === selectedId ? 'is-active' : ''}
          onClick={() => setSelectedId(profile.id)}
        >
          <img src={profile.image} alt="" />
          <span>
            <strong>{profile.name}</strong>
            <small>{profile.intentNote}</small>
          </span>
          <MessageCircle size={18} />
        </button>
      ))}
    </div>
  )
}

function EmptyState({
  Icon,
  title,
  description,
  actions = [],
}: {
  Icon: LucideIcon
  title: string
  description: string
  actions?: { label: string; Icon: LucideIcon; onClick: () => void }[]
}) {
  return (
    <div className="empty-state">
      <div className="empty-orbit" aria-hidden="true">
        <Icon size={27} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actions.length > 0 && (
        <div className="empty-actions">
          {actions.map(({ label, Icon: ActionIcon, onClick }) => (
            <button
              type="button"
              className="ghost-button"
              key={label}
              onClick={onClick}
            >
              <ActionIcon size={17} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="profile-grid" aria-label="Caricamento profili">
      {[0, 1, 2].map((item) => (
        <article
          className={`profile-card skeleton-card ${item === 0 ? 'is-featured' : ''}`}
          key={item}
        >
          <div className="photo-frame skeleton-block" />
          <div className="profile-body">
            <span className="skeleton-line is-wide" />
            <span className="skeleton-line" />
            <span className="skeleton-line is-short" />
            <div className="tag-row">
              <span className="skeleton-pill" />
              <span className="skeleton-pill" />
              <span className="skeleton-pill" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function InviteManager({
  invites,
  invitePurpose,
  setInvitePurpose,
  createInvite,
  copyInvite,
}: {
  invites: Invite[]
  invitePurpose: string
  setInvitePurpose: Dispatch<SetStateAction<string>>
  createInvite: () => void
  copyInvite: (code: string) => void
}) {
  return (
    <section className="invite-manager">
      <div className="invite-create">
        <label>
          Motivo
          <input
            value={invitePurpose}
            onChange={(event) => setInvitePurpose(event.target.value)}
          />
        </label>
        <button type="button" className="primary-button" onClick={createInvite}>
          <Plus size={18} />
          Crea invito
        </button>
      </div>

      <div className="invite-list">
        {BASE_INVITES.map((code) => (
          <div className="invite-row" key={code}>
            <span>
              <strong>{code}</strong>
              <small>Codice iniziale</small>
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => copyInvite(code)}
              aria-label={`Copia ${code}`}
              title="Copia"
            >
              <Copy size={17} />
            </button>
          </div>
        ))}

        {invites.map((invite) => (
          <div className="invite-row" key={`${invite.id ?? invite.code}`}>
            <span>
              <strong>{invite.code}</strong>
              <small>
                {invite.purpose} · {invite.createdAt}
                {invite.used ? ' · usato' : ''}
              </small>
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => copyInvite(invite.code)}
              aria-label={`Copia ${invite.code}`}
              title="Copia"
            >
              <Copy size={17} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function OwnProfileEditor({
  profile,
  setProfile,
  session,
  onSave,
  saving,
}: {
  profile: OwnProfile
  setProfile: Dispatch<SetStateAction<OwnProfile>>
  session: Session
  onSave: () => void
  saving: boolean
}) {
  function toggleSection(section: SectionKey) {
    setProfile((current) => {
      const hasSection = current.sections.includes(section)
      const sections = hasSection
        ? current.sections.filter((item) => item !== section)
        : [...current.sections, section]

      return {
        ...current,
        sections: sections.length ? sections : current.sections,
      }
    })
  }

  return (
    <section className="profile-editor">
      <div className="form-grid">
        <label>
          Nome
          <input
            value={profile.firstName}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
            autoComplete="given-name"
          />
        </label>

        <label>
          Cognome
          <input
            value={profile.lastName}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
            autoComplete="family-name"
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Username
          <input
            value={profile.username}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                username: normalizeUsername(event.target.value),
              }))
            }
            autoComplete="username"
          />
        </label>

        <label>
          Data di nascita
          <input
            value={profile.birthDate}
            type="date"
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                birthDate: event.target.value,
                age: calculateAge(event.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Nome pubblico
          <input
            value={profile.displayName || session.name}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Citta
          <input
            value={profile.city || session.city}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Mi identifico come
          <select
            value={profile.gender}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                gender: event.target.value,
              }))
            }
          >
            <option value="">Scegli</option>
            <option value="woman">Donna</option>
            <option value="man">Uomo</option>
            <option value="non-binary">Non binario</option>
            <option value="private">Preferisco non dirlo</option>
          </select>
        </label>

        <label>
          Obiettivo
          <select
            value={profile.relationshipGoal}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                relationshipGoal: event.target.value,
              }))
            }
          >
            <option value="">Scegli</option>
            {RELATIONSHIP_GOALS.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Bio
        <textarea
          value={profile.bio}
          onChange={(event) =>
            setProfile((current) => ({ ...current, bio: event.target.value }))
          }
          rows={4}
        />
      </label>

      <label>
        Interessi
        <input
          value={profile.interests.join(', ')}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              interests: parseInterests(event.target.value),
            }))
          }
          placeholder="musica live, startup, cinema"
        />
      </label>

      <label>
        Disponibilita
        <input
          value={profile.availability}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              availability: event.target.value,
            }))
          }
        />
      </label>

      <div className="intent-editor">
        {Object.values(SECTION_META).map(({ key, label, Icon }) => (
          <button
            type="button"
            key={key}
            className={profile.sections.includes(key) ? 'is-active' : ''}
            onClick={() => toggleSection(key)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      <label>
        Visibilita
        <select
          value={profile.visibility}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              visibility: event.target.value as OwnProfile['visibility'],
            }))
          }
        >
          <option value="circle">Cerchia privata</option>
          <option value="matches">Solo match</option>
        </select>
      </label>

      <button
        type="button"
        className="primary-button profile-save"
        onClick={onSave}
        disabled={saving}
      >
        <Check size={18} />
        {saving ? 'Salvataggio...' : 'Salva profilo'}
      </button>
    </section>
  )
}

function ChatPanel({
  selectedMatch,
  messages,
  draftMessage,
  setDraftMessage,
  sendMessage,
}: {
  selectedMatch: Profile | null
  messages: Message[]
  draftMessage: string
  setDraftMessage: Dispatch<SetStateAction<string>>
  sendMessage: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="chat-panel" aria-label="Chat">
      <div className="chat-head">
        {selectedMatch ? (
          <>
            <img src={selectedMatch.image} alt="" />
            <span>
              <strong>{selectedMatch.name}</strong>
              <small>{selectedMatch.city}</small>
            </span>
          </>
        ) : (
          <>
            <div className="empty-avatar" aria-hidden="true">
              <MessageCircle size={18} />
            </div>
            <span>
              <strong>Chat</strong>
              <small>Seleziona un match</small>
            </span>
          </>
        )}
      </div>

      <div className="messages">
        {selectedMatch && messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-bubble ${
                message.from === 'me' ? 'is-mine' : ''
              }`}
            >
              <p>{message.text}</p>
              <span>{message.time}</span>
            </div>
          ))
        ) : (
          <div className="empty-chat">
            <MessageCircle size={24} />
            <p>Le conversazioni dei match appariranno qui.</p>
          </div>
        )}
      </div>

      <form className="composer" onSubmit={sendMessage}>
        <input
          value={draftMessage}
          onChange={(event) => setDraftMessage(event.target.value)}
          disabled={!selectedMatch}
          placeholder={selectedMatch ? 'Scrivi un messaggio' : 'Nessun match'}
        />
        <button
          type="submit"
          className="icon-button send-button"
          disabled={!selectedMatch || !draftMessage.trim()}
          aria-label="Invia"
          title="Invia"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  )
}

export default App
