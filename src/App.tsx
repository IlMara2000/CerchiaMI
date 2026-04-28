import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
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
  displayName: string
  age: number
  city: string
  bio: string
  availability: string
  sections: SectionKey[]
  visibility: 'circle' | 'matches'
}

type AccessRequest = {
  inviteCode: string
  name: string
  age: number
  city: string
  accepted: boolean
}

type RemoteProfileRow = {
  id: string
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
  const seed = encodeURIComponent(name.trim() || 'CerchiaMi')
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&backgroundColor=ffd5dc,c0aede,b6e3f4,d1d4f9`
}

function rowToOwnProfile(row: RemoteProfileRow): OwnProfile {
  return {
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
): Session {
  return {
    userId,
    backend: userId ? 'supabase' : 'local',
    name: profile.displayName,
    age: profile.age,
    city: profile.city,
    inviteCode,
    createdAt: new Date().toISOString(),
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

  return {
    id: row.id,
    name: row.display_name,
    age: row.age,
    city: row.city,
    distance: stableDistance(row.id, row.city, viewerCity),
    role: row.visibility === 'matches' ? 'Profilo riservato' : 'Membro CerchiaMi',
    image: avatarFor(row.display_name),
    sections,
    tags: sections.map((section) => SECTION_META[section].label),
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

function validateAccessRequest(request: AccessRequest) {
  if (!request.name.trim() || !request.city.trim()) {
    return 'Nome e citta sono obbligatori.'
  }

  if (!Number.isFinite(request.age) || request.age < 18) {
    return 'Accesso consentito solo a persone maggiorenni.'
  }

  if (!request.accepted) {
    return 'Serve accettare regole 18+, consenso e rispetto.'
  }

  if (!request.inviteCode.trim()) {
    return 'Inserisci un codice invito.'
  }

  return null
}

function isLocalInviteValid(code: string, invites: Invite[]) {
  if (BASE_INVITES.includes(code)) {
    return true
  }

  return invites.some(
    (invite) => invite.code.toUpperCase() === code && !invite.used,
  )
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
              .select(
                'id, display_name, age, city, bio, availability, sections, visibility, created_at',
              )
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

      setCurrentUserId(userId)

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, display_name, age, city, bio, availability, sections, visibility, created_at',
        )
        .eq('id', userId)
        .maybeSingle()

      if (cancelled) {
        return
      }

      if (profileError) {
        setBackendStatus('error')
        setBackendDetail('Profilo Supabase non leggibile.')
        return
      }

      if (profileRow) {
        const restoredProfile = rowToOwnProfile(profileRow as RemoteProfileRow)
        setOwnProfile(restoredProfile)
        setSession((current) => {
          if (current?.backend === 'supabase' && current.userId === userId) {
            return current
          }

          return ownProfileToSession(restoredProfile, 'SESSIONE-SALVATA', userId)
        })
        await refreshRemoteData(userId, restoredProfile.city)
      } else {
        setBackendStatus('connected')
        setBackendDetail('Backend pronto, completa il profilo.')
      }
    }

    void restoreSupabaseSession()

    return () => {
      cancelled = true
    }
  }, [refreshRemoteData, setOwnProfile, setSession])

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

  function completeLocalAccess(request: AccessRequest, code: string) {
    const profile: OwnProfile = {
      ...ownProfile,
      displayName: request.name.trim(),
      age: request.age,
      city: request.city.trim(),
    }

    setOwnProfile(profile)
    setSession(ownProfileToSession(profile, code))
    setInvites((current) =>
      current.map((invite) =>
        invite.code.toUpperCase() === code ? { ...invite, used: true } : invite,
      ),
    )
  }

  async function saveProfileToSupabase(userId: string, profile: OwnProfile) {
    if (!supabase) {
      return
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
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
  ) {
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

    if (!remoteInvite.used_by) {
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

  async function handleAccess(request: AccessRequest) {
    const validationError = validateAccessRequest(request)

    if (validationError) {
      return validationError
    }

    const normalizedCode = request.inviteCode.trim().toUpperCase()
    const localInviteValid = isLocalInviteValid(normalizedCode, invites)

    if (!supabase) {
      if (!localInviteValid) {
        return 'Codice invito non valido.'
      }

      completeLocalAccess(request, normalizedCode)
      return null
    }

    setBackendStatus('syncing')
    setBackendDetail('Creo sessione e profilo Supabase.')

    const { data: signInData, error: signInError } =
      await supabase.auth.signInAnonymously()

    if (signInError || !signInData.user) {
      setBackendStatus('error')
      setBackendDetail('Abilita Anonymous sign-ins su Supabase.')

      if (localInviteValid) {
        completeLocalAccess(request, normalizedCode)
        setNotice('Supabase non accetta accessi anonimi: continuo in locale.')
        return null
      }

      return 'Accesso Supabase non disponibile e codice locale non valido.'
    }

    const userId = signInData.user.id
    const inviteClaim = await claimInviteCode(
      normalizedCode,
      userId,
      localInviteValid,
    )

    if (!inviteClaim.ok) {
      await supabase.auth.signOut()
      setBackendStatus('connected')
      setBackendDetail('Backend pronto, codice rifiutato.')
      return inviteClaim.message ?? 'Codice invito non valido.'
    }

    const profile: OwnProfile = {
      ...ownProfile,
      displayName: request.name.trim(),
      age: request.age,
      city: request.city.trim(),
    }

    try {
      await saveProfileToSupabase(userId, profile)
      setOwnProfile(profile)
      setCurrentUserId(userId)
      setSession(ownProfileToSession(profile, normalizedCode, userId))
      setInvites((current) =>
        current.map((invite) =>
          invite.code.toUpperCase() === normalizedCode
            ? { ...invite, used: true }
            : invite,
        ),
      )
      await refreshRemoteData(userId, profile.city)
      setNotice('Profilo creato e sincronizzato.')
      return null
    } catch (error) {
      console.error(error)
      await supabase.auth.signOut()
      setCurrentUserId(null)
      setBackendStatus('error')
      setBackendDetail('Esegui lo schema SQL aggiornato su Supabase.')

      if (localInviteValid) {
        completeLocalAccess(request, normalizedCode)
        setNotice('Backend non pronto: app attiva in locale.')
        return null
      }

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

    setProfileSaving(true)

    try {
      if (supabase && currentUserId) {
        await saveProfileToSupabase(currentUserId, ownProfile)
        await refreshRemoteData(currentUserId, ownProfile.city)
        setBackendStatus('connected')
        setBackendDetail('Profilo sincronizzato con Supabase.')
      }

      setSession((current) =>
        current
          ? {
              ...current,
              name: ownProfile.displayName,
              age: ownProfile.age,
              city: ownProfile.city,
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
    if (supabase && session?.backend === 'supabase') {
      await supabase.auth.signOut()
    }

    setSession(null)
    setCurrentUserId(null)
    setRemoteState(REMOTE_STATE_EMPTY)
    setActiveView('discover')
    setSelectedMatchId(null)
  }

  if (!session) {
    return (
      <InviteAccess
        ownProfile={ownProfile}
        onAccess={handleAccess}
        backendStatus={backendStatus}
      />
    )
  }

  return (
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
            <Lock size={15} />
            Invito
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

function InviteAccess({
  ownProfile,
  onAccess,
  backendStatus,
}: {
  ownProfile: OwnProfile
  onAccess: (request: AccessRequest) => Promise<string | null>
  backendStatus: BackendStatus
}) {
  const [inviteCode, setInviteCode] = useState('')
  const [name, setName] = useState(ownProfile.displayName)
  const [age, setAge] = useState(String(ownProfile.age))
  const [city, setCity] = useState(ownProfile.city)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const submitError = await onAccess({
      inviteCode,
      name,
      age: Number(age),
      city,
      accepted,
    })

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
            <KeyRound size={22} />
          </div>
          <div>
            <p className="eyebrow">Solo invito · Gratis</p>
            <h1 id="auth-title">CerchiaMi</h1>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Codice invito
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoComplete="one-time-code"
              placeholder="CERCHIAMI-XXXX"
            />
          </label>

          <div className="form-grid">
            <label>
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="given-name"
                placeholder="Il tuo nome"
              />
            </label>

            <label>
              Eta
              <input
                value={age}
                onChange={(event) => setAge(event.target.value)}
                inputMode="numeric"
                min="18"
                type="number"
              />
            </label>
          </div>

          <label>
            Citta
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="address-level2"
              placeholder="Milano"
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>Confermo 18+, consenso esplicito e comportamento rispettoso.</span>
          </label>

          <div className={`backend-note is-${backendStatus}`}>
            <Database size={16} />
            <span>
              {backendStatus === 'missing'
                ? 'Pronta anche senza backend: i dati restano nel browser.'
                : 'Se Supabase e attivo, profilo e chat vengono sincronizzati.'}
            </span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={submitting}>
            <Lock size={18} />
            {submitting ? 'Accesso...' : 'Entra'}
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
          Eta
          <input
            value={profile.age}
            min="18"
            type="number"
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                age: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>

      <label>
        Citta
        <input
          value={profile.city || session.city}
          onChange={(event) =>
            setProfile((current) => ({ ...current, city: event.target.value }))
          }
        />
      </label>

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
