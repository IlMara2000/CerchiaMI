# Cerchio

MVP React + TypeScript per un'app di incontri privata, gratuita e solo su invito.

## Avvio locale

```bash
npm install
npm run dev
```

Codici invito iniziali:

- `CERCHIO-2026`
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

## Prossimi passi per produzione

- Sostituire `localStorage` con database server-side.
- Usare autenticazione reale e codici invito monouso.
- Aggiungere moderazione, segnalazioni, blocco utenti e verifica identita.
- Spostare foto e chat su storage/API sicure.
