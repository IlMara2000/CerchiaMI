# CerchiaMi

MVP React + TypeScript per un'app di incontri privata, gratuita e solo su invito.

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
- Persistenza locale tramite `localStorage`.
- Client Supabase configurato tramite variabili ambiente.

## Supabase

Lo schema iniziale e le policy RLS sono in `supabase/schema.sql`.

Per preparare il backend:

1. Apri Supabase SQL Editor.
2. Incolla ed esegui `supabase/schema.sql`.
3. In Vercel aggiungi queste variabili:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## Prossimi passi per produzione

- Sostituire `localStorage` con database server-side.
- Usare autenticazione reale e codici invito monouso.
- Aggiungere moderazione, segnalazioni, blocco utenti e verifica identita.
- Spostare foto e chat su storage/API sicure.
