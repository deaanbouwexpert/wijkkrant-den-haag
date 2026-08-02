# Wijkkrant — installatie-instructies (Supabase-versie)

Dit is een complete, werkende website: openbare wijkkrant, insturen met
foto's, en een redactiepagina waar jij alles goedkeurt voor het live gaat.
Alles wat leden insturen komt eerst in een wachtrij — er verschijnt nooit
iets automatisch openbaar.

Deze versie gebruikt jouw eigen **Supabase**-account voor zowel de tekst
als de foto's — je hebt dus geen extra opslagdienst nodig.

Je hebt nodig:
1. **GitHub** — waar de code staat
2. **Vercel** — waar de website draait
3. **Supabase** — waar de gegevens en foto's bewaard worden (heb je al)
4. **Anthropic** (console.anthropic.com) — alleen nodig voor de optionele
   AI-spellingcontrole

---

## Stap 1 — Een Supabase-project klaarzetten

1. Log in op supabase.com.
2. Klik **New Project** (of gebruik een bestaand, leeg project).
3. Kies een naam, bijv. `wijkkrant`, stel een databasewachtwoord in (bewaar
   dit ergens, al heb je het voor deze site verder niet meer nodig), en
   kies een regio dicht bij Nederland (bijv. **Frankfurt / eu-central-1**).
4. Wacht tot het project is aangemaakt (duurt een minuutje).

### Tabel aanmaken

1. Ga in het project naar **SQL Editor** (linkermenu).
2. Klik **New query**, plak dit erin, en klik **Run**:

```sql
create table if not exists wijkkrant_store (
  key text primary key,
  value jsonb not null
);
```

### Opslagplek voor foto's aanmaken

1. Ga naar **Storage** (linkermenu) → **New bucket**.
2. Naam: `wijkkrant-images`
3. Zet de schakelaar **Public bucket** aan.
4. Klik **Create bucket**.

### Sleutels ophalen

1. Ga naar **Project Settings → API**.
2. Kopieer de **Project URL**.
3. Kopieer de **service_role** key (niet de "anon" key — de service_role
   key staat vaak achter een oogje/"Reveal"-knop). Deze is geheim, deel
   hem nooit publiekelijk.

Bewaar deze twee waarden, ze zijn nodig in stap 4.

## Stap 2 — Code naar GitHub

(Dit heb je vermoedelijk al gedaan.) Zorg dat de mapstructuur klopt: de
mappen `app`, `lib`, `components` moeten er als mappen instaan (dus
bijv. `app/api/posts/route.js`, niet losse bestanden zonder pad).

## Stap 3 — Project importeren in Vercel

1. vercel.com → **Add New → Project** → kies je GitHub-repository → **Import**.
2. Klap **Environment Variables** open (zie stap 4) vóór je op Deploy klikt.

## Stap 4 — Omgevingsvariabelen instellen

Voeg deze vier toe (in Vercel: Environment Variables, of tijdens het
importeren):

| Naam | Waarde |
|---|---|
| `SUPABASE_URL` | De Project URL uit Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | De service_role key uit Supabase |
| `ADMIN_PASSWORD` | Een wachtwoord naar keuze voor de redactiepagina |
| `ANTHROPIC_API_KEY` | (optioneel) je Anthropic API-key voor spellingcontrole |

## Stap 5 — Deployen

Klik **Deploy**. Na ongeveer een minuut krijg je een werkende link.

Test:
- Open de link → **Iets insturen** → stuur een testbericht met foto.
- Ga naar **Redactie** → log in met je `ADMIN_PASSWORD` → keur het goed →
  check of het op de hoofdpagina verschijnt.

Werkt het insturen niet? Ga in Vercel naar **Deployments → (nieuwste) →
Logs (of "Runtime Logs")** en kijk of daar een foutmelding staat over
Supabase — meestal wijst dat op een typefout in de URL/sleutel, of dat de
tabel/bucket nog niet is aangemaakt.

## Stap 6 — Eigen domeinnaam koppelen

Vercel → **Settings → Domains** → domeinnaam invullen → de getoonde
DNS-instelling bij je domeinregistrar toevoegen.

## Hoe werkt de AI-spellingcontrole?

Bij het insturen staat een aanvinkvakje: *"Laat AI mijn tekst controleren
op spelling en grammatica"*. Staat het aan, dan wordt alleen de
spelling/grammatica gecorrigeerd — inhoud, toon en taal blijven gelijk.
Zonder `ANTHROPIC_API_KEY` doet dit vakje niets (de originele tekst wordt
gewoon gebruikt).

## Kosten

- Vercel gratis niveau: ruim voldoende.
- Supabase gratis niveau: ruim voldoende voor tekst en een flink aantal foto's.
- Anthropic API: enkele centen per maand bij normaal gebruik.

## Later iets aanpassen?

Kom terug in het gesprek met Claude en vraag het gewoon. Overzicht van de
bestanden: `app/page.js` = openbare pagina, `app/submit/page.js` =
insturen, `app/admin/page.js` = redactie, `lib/categories.js` =
categorieën en kleuren, `lib/kv.js` = opslag (Supabase).
