# CerchiaMi

App React + TypeScript per incontri privati tra adulti appassionati di manga,
anime, cosplay, tattoo, videogiochi e GDR. Match e messaggi restano gratuiti.
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
- Tre sezioni: amicizia, relazione, chimica 18+.
- Marketplace `Drop` con catalogo affiliato, categorie e sponsor dichiarati.
- Feed marketplace opzionale aggiornato automaticamente ogni ora.
- Tracciamento Supabase dei click commerciali con RLS per utente autenticato.
- Profili, filtri, interessi, match e chat.
- Creazione e copia di nuovi codici invito.
- Profilo personale modificabile.
- Sincronizzazione Supabase per profili, inviti, like, match e messaggi.
- Pagine pubbliche `/terms`, `/privacy`, `/cookie`, `/safety`.
- Salvataggio versione consenso legale, blocco utenti, segnalazioni e richiesta
  cancellazione account tramite Supabase.

## Supabase

Lo schema e le policy RLS sono in `supabase/schema.sql`.

Per preparare il backend:

1. Apri Supabase SQL Editor.
2. Incolla ed esegui `supabase/schema.sql`.
3. In Supabase Auth abilita il provider Email. Se vuoi entrare subito senza
   link di conferma, disattiva temporaneamente la conferma email.
4. Disattiva Captcha protection in Auth, oppure integra un captcha token nel
   client: senza token Supabase blocca la creazione account.
5. In Vercel aggiungi queste variabili:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Marketplace automatico

Le URL affiliate complete vanno inserite in Vercel senza modificare il codice:

```bash
VITE_AFFILIATE_MANGA_URL
VITE_AFFILIATE_COSPLAY_URL
VITE_AFFILIATE_GAMING_URL
VITE_AFFILIATE_TATTOO_URL
```

Per alimentare il catalogo automaticamente usa `VITE_MARKETPLACE_FEED_URL` con
un endpoint HTTPS CORS che restituisce un array JSON, oppure `{ "items": [...] }`.
Ogni elemento supporta `id`, `title`, `subtitle`, `category`, `price`, `source`,
`image`, `url` e `affiliate`. Le categorie valide sono `manga`, `cosplay`,
`gaming` e `tattoo`.

Uno sponsor nativo opzionale si configura con:

```bash
VITE_SPONSOR_NAME
VITE_SPONSOR_COPY
VITE_SPONSOR_URL
VITE_SPONSOR_IMAGE
```

Lo spazio sponsor resta nascosto se `VITE_SPONSOR_URL` non e impostata.

Con queste variabili presenti al momento della build, Vercel genera una versione
online collegata a Supabase.

`SUPABASE_SERVICE_ROLE_KEY` deve stare solo in Vercel/server: serve alla funzione
`/api/delete-account` per eliminare definitivamente l'utente Supabase Auth. Non
va mai esposta nel client o in variabili `VITE_`.
