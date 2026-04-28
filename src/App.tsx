import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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
type BackendStatus = 'checking' | 'connected' | 'missing' | 'error'

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
}

type Session = {
  name: string
  age: number
  city: string
  inviteCode: string
  createdAt: string
}

type Invite = {
  code: string
  purpose: string
  createdAt: string
  used: boolean
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

const SECTION_META: Record<SectionKey, SectionMeta> = {
  network: {
    key: 'network',
    label: 'Lavoro / amicizia',
    title: 'Conoscere persone per lavoro o amicizia',
    detail: 'Progetti, contatti, nuovi giri sociali.',
    Icon: Briefcase,
  },
  relationship: {
    key: 'relationship',
    label: 'Relazione',
    title: 'Conoscere persone per eventuale relazione',
    detail: 'Incontri con intenzione chiara e tempi realistici.',
    Icon: Heart,
  },
  night: {
    key: 'night',
    label: 'Notte piccante',
    title: 'Conoscere persone per notte piccante',
    detail: 'Solo 18+, consenso esplicito e confini rispettati.',
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

function nowTime() {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function makeInviteCode() {
  const fragment = Math.random().toString(36).slice(2, 6).toUpperCase()
  const suffix = Math.floor(100 + Math.random() * 900)
  return `CERCHIAMI-${fragment}-${suffix}`
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

  useEffect(() => {
    let cancelled = false

    async function verifySupabase() {
      if (!supabase) {
        setBackendStatus('missing')
        return
      }

      const { error } = await supabase.auth.getSession()

      if (!cancelled) {
        setBackendStatus(error ? 'error' : 'connected')
      }
    }

    void verifySupabase()

    return () => {
      cancelled = true
    }
  }, [])

  const matchingProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return PEOPLE.filter((profile) => {
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
  }, [activeSection, availableOnly, maxDistance, query])

  const matchedProfiles = useMemo(
    () =>
      PEOPLE.filter((profile) => matchedIds.includes(profile.id)).sort(
        (first, second) =>
          matchedIds.indexOf(first.id) - matchedIds.indexOf(second.id),
      ),
    [matchedIds],
  )

  const selectedMatch =
    matchedProfiles.find((profile) => profile.id === selectedMatchId) ??
    matchedProfiles[0] ??
    null

  const activeMeta = SECTION_META[activeSection]
  const isNightLocked = activeSection === 'night' && !nightAccepted

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

  function likeProfile(profile: Profile) {
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

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedMatch || !draftMessage.trim()) {
      return
    }

    const nextMessage: Message = {
      id: `${selectedMatch.id}-${Date.now()}`,
      from: 'me',
      text: draftMessage.trim(),
      time: nowTime(),
    }

    setMessages((current) => ({
      ...current,
      [selectedMatch.id]: [...(current[selectedMatch.id] ?? []), nextMessage],
    }))
    setDraftMessage('')
  }

  function createInvite() {
    const invite: Invite = {
      code: makeInviteCode(),
      purpose: invitePurpose.trim() || 'Nuovo invito privato',
      createdAt: new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
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

  function logout() {
    setSession(null)
    setActiveView('discover')
    setSelectedMatchId(null)
  }

  if (!session) {
    return (
      <InviteAccess
        invites={invites}
        ownProfile={ownProfile}
        setOwnProfile={setOwnProfile}
        setSession={setSession}
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
            <h1>Incontri privati</h1>
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
                  likedIds={likedIds}
                  passedIds={passedIds}
                  matchedIds={matchedIds}
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
              invites={invites}
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
            />
          )}
        </section>

        <aside className="side-pane" aria-label="Chat e stato">
          <div className="user-summary">
            <div>
              <p className="eyebrow">Accesso attivo</p>
              <h2>{session.name}</h2>
              <p>
                {session.city} · {session.age} anni
              </p>
            </div>
            <BadgeCheck size={24} />
          </div>

          <div className="stats-grid">
            <div>
              <strong>{likedIds.length}</strong>
              <span>interessi</span>
            </div>
            <div>
              <strong>{matchedProfiles.length}</strong>
              <span>match</span>
            </div>
            <div>
              <strong>{invites.length + BASE_INVITES.length}</strong>
              <span>inviti</span>
            </div>
          </div>

          <BackendStatusPanel status={backendStatus} />

          <ChatPanel
            selectedMatch={selectedMatch}
            messages={selectedMatch ? messages[selectedMatch.id] ?? [] : []}
            draftMessage={draftMessage}
            setDraftMessage={setDraftMessage}
            sendMessage={sendMessage}
          />
        </aside>
      </main>
    </div>
  )
}

function BackendStatusPanel({ status }: { status: BackendStatus }) {
  const copy: Record<BackendStatus, { label: string; detail: string }> = {
    checking: {
      label: 'Verifica backend',
      detail: 'Controllo configurazione Supabase.',
    },
    connected: {
      label: 'Supabase collegato',
      detail: 'URL e publishable key sono attive.',
    },
    missing: {
      label: 'Backend locale',
      detail: 'Aggiungi le variabili Supabase per sincronizzare.',
    },
    error: {
      label: 'Supabase da verificare',
      detail: 'Controlla URL e publishable key.',
    },
  }

  return (
    <section className={`backend-status is-${status}`} aria-label="Backend">
      <Database size={20} />
      <span>
        <strong>{copy[status].label}</strong>
        <small>{copy[status].detail}</small>
      </span>
    </section>
  )
}

function InviteAccess({
  invites,
  ownProfile,
  setOwnProfile,
  setSession,
}: {
  invites: Invite[]
  ownProfile: OwnProfile
  setOwnProfile: React.Dispatch<React.SetStateAction<OwnProfile>>
  setSession: React.Dispatch<React.SetStateAction<Session | null>>
}) {
  const [inviteCode, setInviteCode] = useState('')
  const [name, setName] = useState(ownProfile.displayName)
  const [age, setAge] = useState(String(ownProfile.age))
  const [city, setCity] = useState(ownProfile.city)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = inviteCode.trim().toUpperCase()
    const validCodes = new Set([
      ...BASE_INVITES,
      ...invites.map((invite) => invite.code.toUpperCase()),
    ])
    const parsedAge = Number(age)

    if (!validCodes.has(normalizedCode)) {
      setError('Codice invito non valido.')
      return
    }

    if (!name.trim() || !city.trim()) {
      setError('Nome e citta sono obbligatori.')
      return
    }

    if (!Number.isFinite(parsedAge) || parsedAge < 18) {
      setError('Accesso consentito solo a persone maggiorenni.')
      return
    }

    if (!accepted) {
      setError('Serve accettare regole 18+, consenso e rispetto.')
      return
    }

    const session: Session = {
      name: name.trim(),
      age: parsedAge,
      city: city.trim(),
      inviteCode: normalizedCode,
      createdAt: new Date().toISOString(),
    }

    setOwnProfile((current) => ({
      ...current,
      displayName: session.name,
      age: session.age,
      city: session.city,
    }))
    setSession(session)
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

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button">
            <Lock size={18} />
            Entra
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
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
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
  setInvitePurpose: React.Dispatch<React.SetStateAction<string>>
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
          <div className="invite-row" key={invite.code}>
            <span>
              <strong>{invite.code}</strong>
              <small>
                {invite.purpose} · {invite.createdAt}
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
}: {
  profile: OwnProfile
  setProfile: React.Dispatch<React.SetStateAction<OwnProfile>>
  session: Session
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
          Citta
          <input
            value={profile.city || session.city}
            onChange={(event) =>
              setProfile((current) => ({ ...current, city: event.target.value }))
            }
          />
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
  setDraftMessage: React.Dispatch<React.SetStateAction<string>>
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
