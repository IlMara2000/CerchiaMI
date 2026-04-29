# CerchiaMi

App React + TypeScript per incontri privati, gratuiti e solo su invito.
La versione online usa Supabase per login email, profili, inviti, like, match e
messaggi, e Vercel per il deploy/API del disclaimer giornaliero.

## Avvio locale

```bash
npm install
npm run dev
```

Per collegare Supabase in locale, crea `.env.local` partendo da
`.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Codici invito iniziali:

- `CERCHIAMI-2026`
- `PRIVATO-18`
- `AMICI-001`

Per testare subito usa `CERCHIAMI-2026` durante l'onboarding dopo il login
email.

## Funzioni incluse

- Login tramite email e password con Supabase Auth.
- Onboarding profilo dopo il primo login: codice invito, nome, cognome,
  username, data di nascita, citta, identita, obiettivo, interessi, bio,
  disponibilita, sezioni e visibilita.
- Disclaimer giornaliero via endpoint Vercel `/api/disclaimer-key`, basato su
  chiave hash IP + giorno e salvato nel browser per non ripeterlo nella stessa
  giornata.
- Conferma 18+, consenso e comportamento rispettoso.
- Tre sezioni: lavoro/amicizia, relazione, notte piccante.
- Profili, filtri, interessi, match e chat.
- Creazione e copia di nuovi codici invito.
- Profilo personale modificabile.
- Sincronizzazione Supabase per profili, inviti, like, match e messaggi.

## Supabase

Lo schema e le policy RLS sono in `supabase/schema.sql`.

Per preparare il backend:

1. Apri Supabase SQL Editor.
2. Incolla ed esegui `supabase/schema.sql`.
3. In Supabase Auth abilita il provider Email. Se vuoi entrare subito senza
   link di conferma, disattiva temporaneamente la conferma email.
4. In Vercel aggiungi queste variabili:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Con queste variabili presenti al momento della build, Vercel genera una versione
online collegata a Supabase.
