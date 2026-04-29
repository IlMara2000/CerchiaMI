import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  BadgeCheck,
  Briefcase,
  Calendar,
  Check,
  Clock,
  Copy,
  Database,
  Flame,
  Heart,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type SectionKey = 'network' | 'relationship' | 'night'
type ViewKey = 'discover' | 'matches' | 'invites' | 'profile'
type BackendStatus = 'checking' | 'connected' | 'syncing' | 'missing' | 'error'
type ProfileSource = 'demo' | 'remote'

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
  verified: boolean
  availableToday: boolean
  likedYou: boolean
  source: ProfileSource
  matchId?: string
}

type Session = {
  userId?: string
  backend: 'local' | 'supabase'
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

type DisclaimerState = {
  key: string
  shouldShow: boolean
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
  created_at?: string
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
  'id, first_name, last_name, username, birth_date, gender, relationship_goal, interests, display_name, age, city, bio, availability, sections, visibility, created_at'

const SECTION_META: Record<SectionKey, SectionMeta> = {
  network: {
    key: 'network',
    label: 'Lavoro / amicizia',
    title: 'Cerchie semplici, non swipe infiniti',
    detail: 'Persone divise per intenzione: contatti, amicizie e nuovi giri sociali.',
    Icon: Briefcase,
  },
  relationship: {
    key: 'relationship',
    label: 'Relazione',
    title: 'Conosci solo chi cerca la stessa direzione',
    detail: 'Meno ambiguita, piu contesto e tempi realistici prima del match.',
    Icon: Heart,
  },
  night: {
    key: 'night',
    label: 'Notte piccante',
    title: 'Sezione 18+ con consenso in primo piano',
    detail: 'Accesso separato, confini chiari e nessuna pressione.',
    Icon: Flame,
  },
}

const BASE_INVITES = ['CERCHIAMI-2026', 'PRIVATO-18', 'AMICI-001']

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

const PEOPLE: Profile[] = [
  {
    id: 'sofia',
    name: 'Sofia',
    age: 31,
    city: 'Milano',
    distance: 3,
    role: 'Product designer',
    image: 'https://randomuser.me/api/portraits/women/65.jpg',
    sections: ['network', 'relationship'],
    tags: ['startup', 'mostre', 'vino naturale'],
    bio: 'Mi piace incontrare persone curiose, con idee da costruire e una vita fuori dallo schermo.',
    availability: 'Aperitivo dopo le 19',
    intentNote: 'Caffe, progetto o cena senza fretta.',
    verified: true,
    availableToday: true,
    likedYou: true,
    source: 'demo',
  },
  {
    id: 'luca',
    name: 'Luca',
    age: 34,
    city: 'Roma',
    distance: 8,
    role: 'Creative director',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    sections: ['relationship', 'night'],
    tags: ['cinema', 'cocktail', 'ironia'],
    bio: 'Cerco chimica, conversazioni sincere e persone che sanno dire cosa desiderano.',
    availability: 'Weekend sera',
    intentNote: 'Prima si capisce il tono, poi si decide insieme.',
    verified: true,
    availableToday: false,
    likedYou: false,
    source: 'demo',
  },
  {
    id: 'giulia',
    name: 'Giulia',
    age: 29,
    city: 'Torino',
    distance: 2,
    role: 'Data analyst',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    sections: ['network', 'relationship'],
    tags: ['trekking', 'lettura', 'AI'],
    bio: 'Energia tranquilla, zero giochi mentali, molti appunti su ristoranti da provare.',
    availability: 'Pausa pranzo o sabato',
    intentNote: 'Amicizia prima, poi si vede.',
    verified: true,
    availableToday: true,
    likedYou: false,
    source: 'demo',
  },
  {
    id: 'marco',
    name: 'Marco',
    age: 36,
    city: 'Bologna',
    distance: 5,
    role: 'Chef',
    image: 'https://randomuser.me/api/portraits/men/75.jpg',
    sections: ['relationship', 'night'],
    tags: ['cucina', 'musica live', 'discrezione'],
    bio: 'Vivo bene con persone adulte, presenti e capaci di parlare dei propri limiti.',
    availability: 'Dopo servizio',
    intentNote: 'Chiarezza, rispetto e nessuna pressione.',
    verified: true,
    availableToday: true,
    likedYou: true,
    source: 'demo',
  },
  {
    id: 'marta',
    name: 'Marta',
    age: 33,
    city: 'Firenze',
    distance: 11,
    role: 'Project manager',
    image: 'https://randomuser.me/api/portraits/women/17.jpg',
    sections: ['network'],
    tags: ['design ops', 'podcast', 'caffe'],
    bio: 'Cerco persone con cui scambiare idee, contatti e magari aprire un progetto laterale.',
    availability: 'Mattine e giovedi sera',
    intentNote: 'Networking leggero e amicizie nuove.',
    verified: false,
    availableToday: false,
    likedYou: false,
    source: 'demo',
  },
  {
    id: 'amir',
    name: 'Amir',
    age: 32,
    city: 'Milano',
    distance: 6,
    role: 'Founder',
    image: 'https://randomuser.me/api/portraits/men/11.jpg',
    sections: ['network', 'relationship'],
    tags: ['fintech', 'running', 'sushi'],
    bio: 'Costruisco aziende, ma mi interessa parlare anche di cose non ottimizzabili.',
    availability: 'Colazione o camminata',
    intentNote: 'Connessioni vere, senza agenda nascosta.',
    verified: true,
    availableToday: true,
    likedYou: false,
    source: 'demo',
  },
  {
    id: 'elena',
    name: 'Elena',
    age: 38,
    city: 'Napoli',
    distance: 9,
    role: 'Fotografa',
    image: 'https://randomuser.me/api/portraits/women/90.jpg',
    sections: ['night'],
    tags: ['arte', 'privacy', 'confini'],
    bio: 'Mi piace la leggerezza quando resta adulta: parole chiare, consenso e discrezione.',
    availability: 'Venerdi tardi',
    intentNote: 'Chimica, privacy e rispetto reciproco.',
    verified: true,
    availableToday: false,
    likedYou: true,
    source: 'demo',
  },
  {
    id: 'riccardo',
    name: 'Riccardo',
    age: 30,
    city: 'Verona',
    distance: 4,
    role: 'Ingegnere',
    image: 'https://randomuser.me/api/portraits/men/51.jpg',
    sections: ['relationship'],
    tags: ['bici', 'cucina thai', 'libri'],
    bio: 'Sono diretto, gentile e felice quando una conversazione continua anche fuori app.',
    availability: 'Domenica pomeriggio',
    intentNote: 'Conoscenza graduale, senza copioni.',
    verified: false,
    availableToday: true,
    likedYou: false,
    source: 'demo',
  },
  {
    id: 'chiara',
    name: 'Chiara',
    age: 27,
    city: 'Parma',
    distance: 7,
    role: 'Trainer',
    image: 'https://randomuser.me/api/portraits/women/28.jpg',
    sections: ['network', 'night'],
    tags: ['fitness', 'dj set', 'spontaneita'],
    bio: 'Mi piacciono le persone pratiche, educate e capaci di scegliere senza sparire.',
    availability: 'Stasera dopo le 21',
    intentNote: 'Leggerezza, consenso e zero ambiguita.',
    verified: true,
    availableToday: true,
    likedYou: false,
    source: 'demo',
  },
]

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
    const parsedValue = rawValue ? (JSON.parse(rawValue) as T) : fallback

    if (
      key === STORAGE.session &&
      parsedValue &&
      typeof parsedValue === 'object' &&
      'backend' in parsedValue &&
      parsedValue.backend === 'local'
    ) {
      return fallback
    }

    return parsedValue
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
  const seed = encodeURIComponent(name.trim() || 'CerchiaMi')
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&backgroundColor=ffd5dc,c0aede,b6e3f4,d1d4f9`
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
    backend: userId ? 'supabase' : 'local',
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

  return {
    id: row.id,
    name: row.display_name,
    age: row.age,
    city: row.city,
    distance: stableDistance(row.id, row.city, viewerCity),
    role: row.visibility === 'matches' ? 'Profilo riservato' : 'Membro CerchiaMi',
    image: avatarFor(row.display_name),
    sections,
    tags: interests.length
      ? interests.slice(0, 4)
      : sections.map((section) => SECTION_META[section].label),
    bio:
      cleanBio ||
      'Profilo appena entrato nella cerchia. Parti leggero e chiedi cosa cerca.',
    availability,
    intentNote: `Aperto a ${sectionLabel}.`,
    verified: true,
    availableToday: /oggi|stasera|sera|weekend/i.test(availability),
    likedYou: likedByIds.has(row.id),
    source: 'remote',
    matchId: matchByProfileId[row.id],
  }
}

function isLocalInviteValid(code: string, invites: Invite[]) {
  if (BASE_INVITES.includes(code)) {
    return true
  }

  return invites.some(
    (invite) => invite.code.toUpperCase() === code && !invite.used,
  )
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

function displayNameFromDraft(draft: OnboardingDraft) {
  return draft.username.trim() || draft.firstName.trim()
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
    session?.backend === 'supabase' ? session.userId ?? null : null,
  )
  const [authEmail, setAuthEmail] = useState(session?.email ?? '')
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>('network')
  const [activeView, setActiveView] = useState<ViewKey>('discover')
  const [query, setQuery] = useState('')
  const [maxDistance, setMaxDistance] = useState(25)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [invitePurpose, setInvitePurpose] = useState('Nuovo invito privato')
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(
    isSupabaseConfigured ? 'checking' : 'missing',
  )
  const [backendDetail, setBackendDetail] = useState(
    isSupabaseConfigured
      ? 'Controllo configurazione Supabase.'
      : 'App pronta in modalita locale.',
  )
  const [profileSaving, setProfileSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [disclaimerState, setDisclaimerState] =
    useState<DisclaimerState | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  const refreshRemoteData = useCallback(
    async (userId: string, viewerCity = ownProfile.city) => {
      if (!supabase) {
        return
      }

      setIsSyncing(true)

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

        if (profilesResult.error) {
          throw profilesResult.error
        }

        if (likesResult.error) {
          throw likesResult.error
        }

        if (matchesResult.error) {
          throw matchesResult.error
        }

        if (invitesResult.error) {
          throw invitesResult.error
        }

        const likeRows = (likesResult.data ?? []) as RemoteLikeRow[]
        const matchRows = (matchesResult.data ?? []) as RemoteMatchRow[]
        const inviteRows = (invitesResult.data ?? []) as RemoteInviteRow[]
        const profileRows = (profilesResult.data ?? []) as RemoteProfileRow[]

        const likedByIds = new Set(
          likeRows
            .filter((like) => like.to_profile === userId)
            .map((like) => like.from_profile),
        )
        const outboundLikedIds = likeRows
          .filter((like) => like.from_profile === userId)
          .map((like) => like.to_profile)
        const matchByProfileId = matchRows.reduce<Record<string, string>>(
          (records, match) => {
            const otherId =
              match.profile_a === userId ? match.profile_b : match.profile_a
            records[otherId] = match.id
            return records
          },
          {},
        )
        const remoteProfiles = profileRows.map((row) =>
          rowToProfile(row, viewerCity, likedByIds, matchByProfileId),
        )

        let remoteMessages: Record<string, Message[]> = {}

        if (matchRows.length) {
          const { data: messageRows, error: messagesError } = await supabase
            .from('messages')
            .select('id, match_id, sender_id, body, created_at')
            .in(
              'match_id',
              matchRows.map((match) => match.id),
            )
            .order('created_at', { ascending: true })

          if (messagesError) {
            throw messagesError
          }

          const profileIdByMatchId = matchRows.reduce<Record<string, string>>(
            (records, match) => {
              records[match.id] =
                match.profile_a === userId ? match.profile_b : match.profile_a
              return records
            },
            {},
          )

          remoteMessages = ((messageRows ?? []) as RemoteMessageRow[]).reduce<
            Record<string, Message[]>
          >((records, message) => {
            const profileId = profileIdByMatchId[message.match_id]

            if (!profileId) {
              return records
            }

            records[profileId] = [
              ...(records[profileId] ?? []),
              {
                id: message.id,
                from: message.sender_id === userId ? 'me' : 'them',
                text: message.body,
                time: nowTime(new Date(message.created_at)),
              },
            ]

            return records
          }, {})
        }

        setRemoteState({
          profiles: remoteProfiles,
          likedIds: outboundLikedIds,
          matchedIds: matchRows.map((match) =>
            match.profile_a === userId ? match.profile_b : match.profile_a,
          ),
          invites: inviteRows
            .filter((invite) => invite.created_by === userId)
            .map((invite) => ({
              id: invite.id,
              code: invite.code,
              purpose: invite.purpose,
              createdAt: formatShortDate(invite.created_at),
              used: Boolean(invite.used_by),
              createdBy: invite.created_by,
              usedBy: invite.used_by,
            })),
          messages: remoteMessages,
          matchByProfileId,
        })
        setBackendStatus('connected')
        setBackendDetail('Dati sincronizzati con Supabase.')
      } catch (error) {
        console.error(error)
        setBackendStatus('error')
        setBackendDetail('Schema o variabili Supabase da verificare.')
      } finally {
        setIsSyncing(false)
      }
    },
    [ownProfile.city],
  )

  const loadProfileForUser = useCallback(
    async (userId: string, email = '') => {
      if (!supabase) {
        return
      }

      setCurrentUserId(userId)
      setAuthEmail(email)

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        setBackendStatus('error')
        setBackendDetail('Profilo Supabase non leggibile.')
        return
      }

      if (!profileRow) {
        setSession(null)
        setOnboardingUserId(userId)
        setBackendStatus('connected')
        setBackendDetail('Completa il profilo per entrare.')
        return
      }

      const restoredProfile = rowToOwnProfile(profileRow as RemoteProfileRow)
      setOwnProfile(restoredProfile)
      setOnboardingUserId(null)
      setSession(
        ownProfileToSession(restoredProfile, 'EMAIL-LOGIN', userId, email),
      )
      await refreshRemoteData(userId, restoredProfile.city)
    },
    [refreshRemoteData, setOwnProfile, setSession],
  )

  useEffect(() => {
    let cancelled = false

    async function loadDisclaimerState() {
      const fallbackKey = `local-${new Date().toISOString().slice(0, 10)}`

      try {
        const response = await fetch('/api/disclaimer-key', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Disclaimer API unavailable')
        }

        const payload = (await response.json()) as { key?: string }
        const key = payload.key || fallbackKey
        const storageKey = `cerchiami.disclaimer.${key}`
        const shouldShow = window.localStorage.getItem(storageKey) !== 'ok'

        if (!cancelled) {
          setDisclaimerState({ key, shouldShow })
          setShowDisclaimer(shouldShow)
        }
      } catch {
        const storageKey = `cerchiami.disclaimer.${fallbackKey}`
        const shouldShow = window.localStorage.getItem(storageKey) !== 'ok'

        if (!cancelled) {
          setDisclaimerState({ key: fallbackKey, shouldShow })
          setShowDisclaimer(shouldShow)
        }
      }
    }

    void loadDisclaimerState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restoreSupabaseSession() {
      if (!supabase) {
        setBackendStatus('missing')
        setBackendDetail('App pronta in modalita locale.')
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (cancelled) {
        return
      }

      if (error) {
        setBackendStatus('error')
        setBackendDetail('Sessione Supabase non leggibile.')
        return
      }

      const userId = data.session?.user.id
      const email = data.session?.user.email ?? ''

      if (!userId) {
        setBackendStatus((current) =>
          current === 'error' ? current : 'connected',
        )
        setBackendDetail((current) =>
          current.includes('Anonymous') || current.includes('schema')
            ? current
            : 'Backend pronto, accesso non ancora eseguito.',
        )
        return
      }

      await loadProfileForUser(userId, email)
    }

    void restoreSupabaseSession()

    return () => {
      cancelled = true
    }
  }, [loadProfileForUser])

  const profiles = useMemo(() => {
    const remoteIds = new Set(remoteState.profiles.map((profile) => profile.id))
    return [
      ...remoteState.profiles,
      ...PEOPLE.filter((profile) => !remoteIds.has(profile.id)),
    ]
  }, [remoteState.profiles])

  const combinedLikedIds = useMemo(
    () => unique([...likedIds, ...remoteState.likedIds]),
    [likedIds, remoteState.likedIds],
  )

  const combinedMatchedIds = useMemo(
    () => unique([...matchedIds, ...remoteState.matchedIds]),
    [matchedIds, remoteState.matchedIds],
  )

  const combinedInvites = useMemo(
    () => [...remoteState.invites, ...invites],
    [invites, remoteState.invites],
  )

  const matchingProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return profiles.filter((profile) => {
      const text = [
        profile.name,
        profile.city,
        profile.role,
        profile.bio,
        profile.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase()

      return (
        profile.sections.includes(activeSection) &&
        profile.distance <= maxDistance &&
        (!availableOnly || profile.availableToday) &&
        (!normalizedQuery || text.includes(normalizedQuery))
      )
    })
  }, [activeSection, availableOnly, maxDistance, profiles, query])

  const matchedProfiles = useMemo(
    () =>
      profiles
        .filter((profile) => combinedMatchedIds.includes(profile.id))
        .sort(
          (first, second) =>
            combinedMatchedIds.indexOf(first.id) -
            combinedMatchedIds.indexOf(second.id),
        ),
    [combinedMatchedIds, profiles],
  )

  const selectedMatch =
    matchedProfiles.find((profile) => profile.id === selectedMatchId) ??
    matchedProfiles[0] ??
    null

  const activeMeta = SECTION_META[activeSection]
  const isNightLocked = activeSection === 'night' && !nightAccepted
  const selectedMessages = selectedMatch
    ? selectedMatch.source === 'remote'
      ? remoteState.messages[selectedMatch.id] ?? []
      : messages[selectedMatch.id] ?? []
    : []
  const visibleBackendStatus =
    session?.backend === 'local' && backendStatus !== 'syncing'
      ? 'missing'
      : backendStatus
  const visibleBackendDetail =
    session?.backend === 'local' && backendStatus !== 'syncing'
      ? 'Dati salvati in questo browser. Supabase si attiva appena configurato.'
      : backendDetail

  async function saveProfileToSupabase(userId: string, profile: OwnProfile) {
    if (!supabase) {
      return
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        first_name: profile.firstName.trim(),
        last_name: profile.lastName.trim(),
        username: normalizeUsername(profile.username),
        birth_date: profile.birthDate || null,
        gender: profile.gender,
        relationship_goal: profile.relationshipGoal,
        interests: profile.interests,
        display_name: profile.displayName.trim(),
        age: Math.max(18, profile.age),
        city: profile.city.trim(),
        bio: profile.bio.trim(),
        availability: profile.availability.trim(),
        sections: profile.sections,
        visibility: profile.visibility,
      },
      { onConflict: 'id' },
    )

    if (error) {
      throw error
    }
  }

  async function claimInviteCode(
    code: string,
    userId: string,
    localInviteValid: boolean,
    markUsed = true,
  ) {
    if (BASE_INVITES.includes(code)) {
      return { ok: true }
    }

    if (!supabase) {
      return { ok: localInviteValid, message: 'Codice invito non valido.' }
    }

    const { data: invite, error } = await supabase
      .from('invites')
      .select('id, code, used_by')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      return localInviteValid
        ? { ok: true }
        : { ok: false, message: 'Codice invito non verificabile.' }
    }

    if (!invite) {
      return localInviteValid
        ? { ok: true }
        : { ok: false, message: 'Codice invito non valido.' }
    }

    const remoteInvite = invite as { id: string; used_by: string | null }

    if (remoteInvite.used_by && remoteInvite.used_by !== userId) {
      return { ok: false, message: 'Codice invito gia utilizzato.' }
    }

    if (!remoteInvite.used_by && markUsed) {
      const { error: updateError } = await supabase
        .from('invites')
        .update({ used_by: userId, used_at: new Date().toISOString() })
        .eq('id', remoteInvite.id)
        .is('used_by', null)

      if (updateError) {
        return {
          ok: false,
          message: 'Codice valido, ma non riesco a marcarlo come usato.',
        }
      }
    }

    return { ok: true }
  }

  async function handleEmailAuth(request: EmailAuthRequest) {
    const validationError = validateEmailAuthRequest(request)

    if (validationError) {
      return validationError
    }

    if (!supabase) {
      setBackendStatus('missing')
      setBackendDetail('Supabase non configurato per questo deploy.')
      return 'Login email non disponibile: manca la configurazione Supabase.'
    }

    const email = request.email.trim()

    setAuthEmail(email)
    setBackendStatus('syncing')
    setBackendDetail(
      request.mode === 'signup'
        ? 'Creo account email su Supabase.'
        : 'Accesso email in corso su Supabase.',
    )

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
        const captchaBlocked = /captcha/i.test(error.message)
        setBackendStatus('error')
        setBackendDetail(
          captchaBlocked
            ? 'Captcha Supabase attivo: serve disattivarlo o integrare un token.'
            : 'Auth Supabase ha rifiutato le credenziali.',
        )
        return captchaBlocked
          ? 'Supabase Auth ha Captcha attivo: disattivalo o configura un captcha token.'
          : error.message
      }

      const user = data.session?.user ?? data.user

      if (!data.session || !user) {
        setBackendStatus('connected')
        setBackendDetail('Controlla la email e poi fai login.')
        return 'Account creato: conferma la email, poi entra con la stessa password.'
      }

      await loadProfileForUser(user.id, user.email ?? email)
      return null
    } catch (error) {
      console.error(error)
      setBackendStatus('error')
      setBackendDetail('Login email non completato.')
      return 'Accesso non completato.'
    }
  }

  async function completeOnboarding(draft: OnboardingDraft) {
    const validationError = validateOnboardingDraft(draft)

    if (validationError) {
      return validationError
    }

    const userId = onboardingUserId ?? currentUserId

    if (!supabase || !userId) {
      return 'Sessione Supabase non trovata: rifai il login email.'
    }

    const normalizedCode = draft.inviteCode.trim().toUpperCase()
    const localInviteValid = isLocalInviteValid(normalizedCode, invites)
    const preflightInvite = await claimInviteCode(
      normalizedCode,
      userId,
      localInviteValid,
      false,
    )

    if (!preflightInvite.ok) {
      setBackendStatus('connected')
      setBackendDetail('Backend pronto, codice invito rifiutato.')
      return preflightInvite.message ?? 'Codice invito non valido.'
    }

    const username = normalizeUsername(draft.username)
    const profile: OwnProfile = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      username,
      birthDate: draft.birthDate,
      gender: draft.gender,
      relationshipGoal: draft.relationshipGoal,
      interests: parseInterests(draft.interests),
      displayName: displayNameFromDraft({ ...draft, username }),
      age: calculateAge(draft.birthDate),
      city: draft.city.trim(),
      bio: draft.bio.trim(),
      availability: draft.availability.trim(),
      sections: draft.sections,
      visibility: draft.visibility,
    }

    setBackendStatus('syncing')
    setBackendDetail('Completo profilo e invito su Supabase.')

    try {
      await saveProfileToSupabase(userId, profile)

      const inviteClaim = await claimInviteCode(
        normalizedCode,
        userId,
        localInviteValid,
      )

      if (!inviteClaim.ok) {
        return inviteClaim.message ?? 'Codice invito non valido.'
      }

      setOwnProfile(profile)
      setCurrentUserId(userId)
      setOnboardingUserId(null)
      setSession(ownProfileToSession(profile, normalizedCode, userId, authEmail))
      setInvites((current) =>
        current.map((invite) =>
          invite.code.toUpperCase() === normalizedCode
            ? { ...invite, used: true }
            : invite,
        ),
      )
      await refreshRemoteData(userId, profile.city)
      setNotice('Profilo completato e sincronizzato.')
      return null
    } catch (error) {
      console.error(error)
      setBackendStatus('error')
      setBackendDetail('Esegui lo schema SQL aggiornato su Supabase.')

      return 'Profilo non salvato su Supabase.'
    }
  }

  function createIntroMessage(profile: Profile) {
    setMessages((current) => {
      if (current[profile.id]?.length) {
        return current
      }

      return {
        ...current,
        [profile.id]: [
          {
            id: `${profile.id}-intro`,
            from: 'them',
            text: `Ciao, sono ${profile.name}. Mi va di capire se siamo sulla stessa lunghezza d'onda.`,
            time: nowTime(),
          },
        ],
      }
    })
  }

  async function likeRemoteProfile(profile: Profile) {
    if (!supabase || !currentUserId) {
      return false
    }

    const { data, error } = await supabase.rpc('like_profile', {
      target_profile: profile.id,
      target_section: activeSection,
    })

    if (error) {
      const { error: insertError } = await supabase.from('likes').upsert(
        {
          from_profile: currentUserId,
          to_profile: profile.id,
          section: activeSection,
        },
        { onConflict: 'from_profile,to_profile,section' },
      )

      if (insertError) {
        throw insertError
      }

      const { data: reverseLike } = await supabase
        .from('likes')
        .select('id')
        .eq('from_profile', profile.id)
        .eq('to_profile', currentUserId)
        .eq('section', activeSection)
        .maybeSingle()

      if (reverseLike) {
        const [profileA, profileB] = [currentUserId, profile.id].sort()
        await supabase.from('matches').upsert(
          {
            profile_a: profileA,
            profile_b: profileB,
            section: activeSection,
          },
          { onConflict: 'profile_a,profile_b,section' },
        )
      }

      await refreshRemoteData(currentUserId)
      return Boolean(reverseLike)
    }

    await refreshRemoteData(currentUserId)
    const rows = (data ?? []) as Array<{ match_id: string | null }>
    return rows.some((row) => row.match_id)
  }

  async function likeProfile(profile: Profile) {
    if (profile.source === 'remote' && currentUserId && supabase) {
      setBackendStatus('syncing')
      setBackendDetail('Salvo interesse su Supabase.')

      try {
        const matched = await likeRemoteProfile(profile)
        setRemoteState((current) => ({
          ...current,
          likedIds: unique([...current.likedIds, profile.id]),
        }))

        if (matched || profile.likedYou) {
          setSelectedMatchId(profile.id)
          setActiveView('matches')
          setNotice(`Match con ${profile.name}.`)
        } else {
          setNotice(`Interesse salvato per ${profile.name}.`)
        }

        setBackendStatus('connected')
        setBackendDetail('Dati sincronizzati con Supabase.')
      } catch (error) {
        console.error(error)
        setBackendStatus('error')
        setBackendDetail('Interesse non salvato su Supabase.')
        setNotice('Non riesco a salvare questo interesse.')
      }

      return
    }

    setLikedIds((current) =>
      current.includes(profile.id) ? current : [...current, profile.id],
    )
    setPassedIds((current) => current.filter((id) => id !== profile.id))

    if (profile.likedYou) {
      setMatchedIds((current) =>
        current.includes(profile.id) ? current : [profile.id, ...current],
      )
      createIntroMessage(profile)
      setSelectedMatchId(profile.id)
      setActiveView('matches')
      setNotice(`Match con ${profile.name}.`)
      return
    }

    setNotice(`Interesse salvato per ${profile.name}.`)
  }

  function passProfile(profile: Profile) {
    setPassedIds((current) =>
      current.includes(profile.id) ? current : [...current, profile.id],
    )
    setNotice(`${profile.name} fuori dalla selezione attiva.`)
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedMatch || !draftMessage.trim()) {
      return
    }

    const text = draftMessage.trim()

    if (
      selectedMatch.source === 'remote' &&
      selectedMatch.matchId &&
      currentUserId &&
      supabase
    ) {
      const optimisticMessage: Message = {
        id: `${selectedMatch.id}-${Date.now()}`,
        from: 'me',
        text,
        time: nowTime(),
      }

      setRemoteState((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [selectedMatch.id]: [
            ...(current.messages[selectedMatch.id] ?? []),
            optimisticMessage,
          ],
        },
      }))
      setDraftMessage('')

      const { error } = await supabase.from('messages').insert({
        match_id: selectedMatch.matchId,
        sender_id: currentUserId,
        body: text,
      })

      if (error) {
        console.error(error)
        setNotice('Messaggio non salvato su Supabase.')
        return
      }

      await refreshRemoteData(currentUserId)
      return
    }

    const nextMessage: Message = {
      id: `${selectedMatch.id}-${Date.now()}`,
      from: 'me',
      text,
      time: nowTime(),
    }

    setMessages((current) => ({
      ...current,
      [selectedMatch.id]: [...(current[selectedMatch.id] ?? []), nextMessage],
    }))
    setDraftMessage('')
  }

  async function createInvite() {
    const code = makeInviteCode()
    const purpose = invitePurpose.trim() || 'Nuovo invito privato'

    if (supabase && currentUserId) {
      setBackendStatus('syncing')
      setBackendDetail('Creo invito su Supabase.')

      const { data, error } = await supabase
        .from('invites')
        .insert({
          code,
          purpose,
          created_by: currentUserId,
        })
        .select('id, code, purpose, created_at, used_by, used_at, created_by')
        .single()

      if (error) {
        console.error(error)
        setBackendStatus('error')
        setBackendDetail('Invito non creato su Supabase.')
        setNotice('Invito non creato: controlla policy Supabase.')
        return
      }

      const invite = data as RemoteInviteRow

      setRemoteState((current) => ({
        ...current,
        invites: [
          {
            id: invite.id,
            code: invite.code,
            purpose: invite.purpose,
            createdAt: formatShortDate(invite.created_at),
            used: false,
            createdBy: invite.created_by,
            usedBy: invite.used_by,
          },
          ...current.invites,
        ],
      }))
      setInvitePurpose('Nuovo invito privato')
      setBackendStatus('connected')
      setBackendDetail('Dati sincronizzati con Supabase.')
      setNotice(`Invito creato: ${code}`)
      return
    }

    const invite: Invite = {
      code,
      purpose,
      createdAt: formatShortDate(new Date()),
      used: false,
    }

    setInvites((current) => [invite, ...current])
    setInvitePurpose('Nuovo invito privato')
    setNotice(`Invito creato: ${invite.code}`)
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setNotice(`Codice copiato: ${code}`)
    } catch {
      setNotice(code)
    }
  }

  async function saveOwnProfile() {
    if (!ownProfile.displayName.trim() || !ownProfile.city.trim()) {
      setNotice('Nome pubblico e citta sono obbligatori.')
      return
    }

    if (
      ownProfile.username &&
      normalizeUsername(ownProfile.username).length < 3
    ) {
      setNotice('Username troppo corto.')
      return
    }

    if (ownProfile.birthDate && calculateAge(ownProfile.birthDate) < 18) {
      setNotice('Il profilo deve essere maggiorenne.')
      return
    }

    setProfileSaving(true)

    try {
      const profileToSave = {
        ...ownProfile,
        username: normalizeUsername(ownProfile.username),
        age: ownProfile.birthDate
          ? calculateAge(ownProfile.birthDate)
          : ownProfile.age,
      }

      if (supabase && currentUserId) {
        await saveProfileToSupabase(currentUserId, profileToSave)
        await refreshRemoteData(currentUserId, profileToSave.city)
        setBackendStatus('connected')
        setBackendDetail('Profilo sincronizzato con Supabase.')
      }

      setOwnProfile(profileToSave)
      setSession((current) =>
        current
          ? {
              ...current,
              name: profileToSave.displayName,
              age: profileToSave.age,
              city: profileToSave.city,
            }
          : current,
      )
      setNotice('Profilo salvato.')
    } catch (error) {
      console.error(error)
      setBackendStatus('error')
      setBackendDetail('Profilo non sincronizzato.')
      setNotice('Profilo salvato solo in locale.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setSession(null)
    setCurrentUserId(null)
    setOnboardingUserId(null)
    setRemoteState(REMOTE_STATE_EMPTY)
    setActiveView('discover')
    setSelectedMatchId(null)
  }

  function acceptDisclaimer() {
    if (disclaimerState) {
      window.localStorage.setItem(
        `cerchiami.disclaimer.${disclaimerState.key}`,
        'ok',
      )
    }

    setShowDisclaimer(false)
  }

  if (!session) {
    return (
      <>
        {onboardingUserId ? (
          <AccountOnboarding
            email={authEmail}
            onComplete={completeOnboarding}
            onLogout={logout}
          />
        ) : (
          <EmailAccess
            onSubmit={handleEmailAuth}
            backendStatus={backendStatus}
            backendDetail={backendDetail}
          />
        )}
        {showDisclaimer && <DisclaimerModal onAccept={acceptDisclaimer} />}
      </>
    )
  }

  return (
    <>
      <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Users size={21} />
          </div>
          <div>
            <p className="eyebrow">CerchiaMi</p>
            <h1>Cerchie private</h1>
          </div>
        </div>

        <nav className="section-switcher" aria-label="Sezioni">
          {Object.values(SECTION_META).map(({ key, label, Icon }) => (
            <button
              type="button"
              key={key}
              className={key === activeSection ? 'is-active' : ''}
              onClick={() => {
                setActiveSection(key)
                setActiveView('discover')
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="status-strip">
          <span>
            <AtSign size={15} />
            Email
          </span>
          <span>
            <ShieldCheck size={15} />
            Gratis
          </span>
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

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Chiudi notifica"
            title="Chiudi"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="workspace">
        <section className="main-pane" aria-labelledby="section-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">{activeMeta.label}</p>
              <h2 id="section-title">{activeMeta.title}</h2>
              <p>{activeMeta.detail}</p>
            </div>
            <div className="section-count">
              <strong>{matchingProfiles.length}</strong>
              <span>profili</span>
            </div>
          </div>

          <div className="view-tabs" role="tablist" aria-label="Vista">
            {[
              { key: 'discover', label: 'Scopri', Icon: Search },
              { key: 'matches', label: 'Match', Icon: MessageCircle },
              { key: 'invites', label: 'Inviti', Icon: UserPlus },
              { key: 'profile', label: 'Profilo', Icon: User },
            ].map(({ key, label, Icon }) => (
              <button
                type="button"
                key={key}
                role="tab"
                aria-selected={activeView === key}
                className={activeView === key ? 'is-active' : ''}
                onClick={() => setActiveView(key as ViewKey)}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          {activeView === 'discover' && (
            <>
              <div className="filters">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nome, citta, interessi"
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
                    onChange={(event) =>
                      setMaxDistance(Number(event.target.value))
                    }
                  />
                </label>

                <label className="toggle-pill">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) =>
                      setAvailableOnly(event.target.checked)
                    }
                  />
                  <span>Disponibili oggi</span>
                </label>
              </div>

              {isNightLocked ? (
                <NightGate onAccept={() => setNightAccepted(true)} />
              ) : (
                <ProfileGrid
                  profiles={matchingProfiles}
                  likedIds={combinedLikedIds}
                  passedIds={passedIds}
                  matchedIds={combinedMatchedIds}
                  onLike={likeProfile}
                  onPass={passProfile}
                />
              )}
            </>
          )}

          {activeView === 'matches' && (
            <MatchesView
              profiles={matchedProfiles}
              selectedId={selectedMatch?.id ?? null}
              setSelectedId={setSelectedMatchId}
            />
          )}

          {activeView === 'invites' && (
            <InviteManager
              invites={combinedInvites}
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

        <aside className="side-pane" aria-label="Chat e stato">
          <div className="user-summary">
            <div>
              <p className="eyebrow">
                {session.backend === 'supabase' ? 'Account sincronizzato' : 'Accesso locale'}
              </p>
              <h2>{session.name}</h2>
              <p>
                {session.city} · {session.age} anni
              </p>
            </div>
            <BadgeCheck size={24} />
          </div>

          <div className="stats-grid">
            <div>
              <strong>{combinedLikedIds.length}</strong>
              <span>interessi</span>
            </div>
            <div>
              <strong>{matchedProfiles.length}</strong>
              <span>match</span>
            </div>
            <div>
              <strong>{combinedInvites.length + BASE_INVITES.length}</strong>
              <span>inviti</span>
            </div>
          </div>

          <BackendStatusPanel
            status={visibleBackendStatus}
            detail={visibleBackendDetail}
            syncing={isSyncing}
            onRefresh={
              currentUserId ? () => refreshRemoteData(currentUserId) : undefined
            }
          />

          <ChatPanel
            selectedMatch={selectedMatch}
            messages={selectedMessages}
            draftMessage={draftMessage}
            setDraftMessage={setDraftMessage}
            sendMessage={sendMessage}
          />
        </aside>
      </main>
      </div>
      {showDisclaimer && <DisclaimerModal onAccept={acceptDisclaimer} />}
    </>
  )
}

function BackendStatusPanel({
  status,
  detail,
  syncing,
  onRefresh,
}: {
  status: BackendStatus
  detail: string
  syncing: boolean
  onRefresh?: () => void
}) {
  const copy: Record<BackendStatus, string> = {
    checking: 'Verifica backend',
    connected: 'Supabase pronto',
    syncing: 'Sincronizzazione',
    missing: 'Modalita locale',
    error: 'Backend da verificare',
  }

  return (
    <section className={`backend-status is-${status}`} aria-label="Backend">
      <Database size={20} />
      <span>
        <strong>{copy[status]}</strong>
        <small>{detail}</small>
      </span>
      {onRefresh && (
        <button
          type="button"
          className="icon-action"
          onClick={onRefresh}
          disabled={syncing}
          aria-label="Sincronizza"
          title="Sincronizza"
        >
          <RefreshCcw size={16} />
        </button>
      )}
    </section>
  )
}

function EmailAccess({
  onSubmit,
  backendStatus,
  backendDetail,
}: {
  onSubmit: (request: EmailAuthRequest) => Promise<string | null>
  backendStatus: BackendStatus
  backendDetail: string
}) {
  const [mode, setMode] = useState<EmailAuthRequest['mode']>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const submitError = await onSubmit({ mode, email, password })

    if (submitError) {
      setError(submitError)
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
            <p className="eyebrow">Email · invito dopo il login</p>
            <h1 id="auth-title">CerchiaMi</h1>
          </div>
        </div>

        <div className="auth-mode" role="tablist" aria-label="Accesso">
          <button
            type="button"
            className={mode === 'login' ? 'is-active' : ''}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'is-active' : ''}
            onClick={() => setMode('signup')}
          >
            Crea account
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="nome@email.it"
              type="email"
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              placeholder="Minimo 6 caratteri"
              type="password"
            />
          </label>

          <div className={`backend-note is-${backendStatus}`}>
            <Database size={16} />
            <span>
              {backendStatus === 'missing'
                ? 'Login email richiede Supabase configurato online.'
                : backendDetail}
            </span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={submitting}>
            {mode === 'signup' ? <UserPlus size={18} /> : <Lock size={18} />}
            {submitting
              ? 'Controllo...'
              : mode === 'signup'
                ? 'Crea account'
                : 'Entra'}
          </button>
        </form>
      </section>

      <section className="auth-preview" aria-label="Profili in evidenza">
        <div className="preview-photo is-large">
          <img src={PEOPLE[0].image} alt="" />
          <span>Work</span>
        </div>
        <div className="preview-photo">
          <img src={PEOPLE[3].image} alt="" />
          <span>Match</span>
        </div>
        <div className="preview-photo is-small">
          <img src={PEOPLE[6].image} alt="" />
          <span>18+</span>
        </div>
      </section>
    </main>
  )
}

function AccountOnboarding({
  email,
  onComplete,
  onLogout,
}: {
  email: string
  onComplete: (draft: OnboardingDraft) => Promise<string | null>
  onLogout: () => void
}) {
  const [step, setStep] = useState(0)
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
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const age = calculateAge(draft.birthDate)
  const steps = [
    'Invito',
    'Identita',
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

      return { ...current, sections }
    })
  }

  function goNext() {
    const stepError = validateOnboardingDraft(draft, step)

    if (stepError) {
      setError(stepError)
      return
    }

    setError('')
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  async function submit() {
    setError('')
    setSubmitting(true)
    const submitError = await onComplete(draft)

    if (submitError) {
      setError(submitError)
    }

    setSubmitting(false)
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-frame" aria-labelledby="onboarding-title">
        <div className="onboarding-top">
          <div className="auth-brand">
            <div className="brand-mark" aria-hidden="true">
              <KeyRound size={22} />
            </div>
            <div>
              <p className="eyebrow">{email || 'Account email'}</p>
              <h1 id="onboarding-title">Costruisci il profilo</h1>
            </div>
          </div>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Esci
          </button>
        </div>

        <div className="step-track" aria-label="Avanzamento profilo">
          {steps.map((label, index) => (
            <span
              key={label}
              className={index === step ? 'is-active' : index < step ? 'is-done' : ''}
            >
              {index + 1}
            </span>
          ))}
        </div>

        <div className="onboarding-card" key={step}>
          {step === 0 && (
            <>
              <p className="eyebrow">Accesso privato</p>
              <h2>Codice invito</h2>
              <label>
                Codice
                <input
                  value={draft.inviteCode}
                  onChange={(event) =>
                    updateDraft('inviteCode', event.target.value.toUpperCase())
                  }
                  autoComplete="one-time-code"
                  placeholder="CERCHIAMI-2026"
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="eyebrow">Dati reali</p>
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
                    placeholder="Nome"
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
                    placeholder="Cognome"
                  />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="eyebrow">Nome pubblico</p>
              <h2>Soprannome</h2>
              <label>
                Username
                <input
                  value={draft.username}
                  onChange={(event) =>
                    updateDraft('username', normalizeUsername(event.target.value))
                  }
                  autoComplete="username"
                  placeholder="mara.mi"
                />
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <p className="eyebrow">18+</p>
              <h2>Data di nascita</h2>
              <label>
                Data
                <input
                  value={draft.birthDate}
                  onChange={(event) =>
                    updateDraft('birthDate', event.target.value)
                  }
                  type="date"
                />
              </label>
              {age > 0 && <p className="field-hint">{age} anni</p>}
            </>
          )}

          {step === 4 && (
            <>
              <p className="eyebrow">Zona</p>
              <h2>Citta</h2>
              <label>
                Dove sei
                <input
                  value={draft.city}
                  onChange={(event) => updateDraft('city', event.target.value)}
                  autoComplete="address-level2"
                  placeholder="Milano"
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
                    <option value="friends">Amicizie e giri sociali</option>
                    <option value="relationship">Relazione</option>
                    <option value="network">Networking leggero</option>
                    <option value="casual">Chimica senza pressione</option>
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
                  onChange={(event) =>
                    updateDraft('interests', event.target.value)
                  }
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
                  onChange={(event) =>
                    updateDraft('accepted', event.target.checked)
                  }
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
        <div className="gate-icon" aria-hidden="true">
          <ShieldCheck size={28} />
        </div>
        <div>
          <p className="eyebrow">Promemoria giornaliero</p>
          <h2 id="disclaimer-title">Stai bene dentro CerchiaMi</h2>
          <p>
            Usa l'app con rispetto. Evita pressioni, contenuti espliciti non
            richiesti, nudi o clip video simili. Le conversazioni funzionano
            meglio quando consenso e discrezione sono chiari.
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

function NightGate({ onAccept }: { onAccept: () => void }) {
  return (
    <section className="safety-gate">
      <div className="gate-icon" aria-hidden="true">
        <ShieldCheck size={30} />
      </div>
      <div>
        <p className="eyebrow">18+ · consenso</p>
        <h3>Confini chiari prima del match</h3>
        <p>
          Questa sezione resta accessibile solo dopo conferma di maggiore eta,
          consenso esplicito e rispetto dei limiti personali.
        </p>
      </div>
      <button type="button" className="primary-button" onClick={onAccept}>
        <Check size={18} />
        Confermo
      </button>
    </section>
  )
}

function ProfileGrid({
  profiles,
  likedIds,
  passedIds,
  matchedIds,
  onLike,
  onPass,
}: {
  profiles: Profile[]
  likedIds: string[]
  passedIds: string[]
  matchedIds: string[]
  onLike: (profile: Profile) => void
  onPass: (profile: Profile) => void
}) {
  if (!profiles.length) {
    return (
      <div className="empty-state">
        <Search size={24} />
        <h3>Nessun profilo trovato</h3>
        <p>Allarga distanza o rimuovi i filtri attivi.</p>
      </div>
    )
  }

  return (
    <div className="profile-grid">
      {profiles.map((profile) => {
        const liked = likedIds.includes(profile.id)
        const passed = passedIds.includes(profile.id)
        const matched = matchedIds.includes(profile.id)

        return (
          <article
            key={profile.id}
            className={`profile-card ${passed ? 'is-muted' : ''}`}
          >
            <div className="photo-frame">
              <img src={profile.image} alt={`${profile.name}, ${profile.age}`} />
              <div className="photo-badges">
                {profile.verified && (
                  <span>
                    <BadgeCheck size={14} />
                    Verificato
                  </span>
                )}
                {profile.source === 'remote' && (
                  <span>
                    <Database size={14} />
                    Live
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
                  <p>{profile.role}</p>
                </div>
                <span className="distance">
                  <MapPin size={14} />
                  {profile.distance} km
                </span>
              </div>

              <p className="profile-bio">{profile.bio}</p>

              <div className="tag-row">
                {profile.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="mini-details">
                <span>
                  <Calendar size={15} />
                  {profile.availability}
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
      <div className="empty-state">
        <Heart size={24} />
        <h3>Nessun match ancora</h3>
        <p>Metti interesse ai profili: alcuni hanno gia ricambiato.</p>
      </div>
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
            <option value="friends">Amicizie e giri sociali</option>
            <option value="relationship">Relazione</option>
            <option value="network">Networking leggero</option>
            <option value="casual">Chimica senza pressione</option>
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
