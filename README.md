# CerchiaMi

App React + TypeScript per incontri privati, gratuiti e solo su invito.
Funziona subito in modalita locale e, quando Supabase e configurato, sincronizza
profili, inviti, like, match e messaggi.

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

## Funzioni incluse

- Accesso bloccato da codice invito.
- Conferma 18+, consenso e comportamento rispettoso.
- Tre sezioni: lavoro/amicizia, relazione, notte piccante.
- Profili, filtri, interessi, match e chat.
- Creazione e copia di nuovi codici invito.
- Profilo personale modificabile.
- Salvataggio locale tramite `localStorage` quando Supabase non e disponibile.
- Sincronizzazione Supabase per profili, inviti, like, match e messaggi.
- Fallback automatico: l'app resta usabile anche senza variabili Vercel.

## Supabase

Lo schema e le policy RLS sono in `supabase/schema.sql`.

Per preparare il backend:

1. Apri Supabase SQL Editor.
2. Incolla ed esegui `supabase/schema.sql`.
3. In Supabase Auth abilita gli accessi anonimi.
4. In Vercel aggiungi queste variabili:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Con queste variabili presenti al momento della build, Vercel genera una versione
online collegata a Supabase. Senza variabili, la stessa app lavora in modalita
locale nel browser.
