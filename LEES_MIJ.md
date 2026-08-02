# Wijkkrant — installatie-instructies

Dit is een complete, werkende website: openbare wijkkrant, insturen met
foto's, en een redactiepagina waar jij alles goedkeurt voor het live gaat.
Alles wat leden insturen komt eerst in een wachtrij — er verschijnt nooit
iets automatisch openbaar.

Je hebt straks 3 gratis accounts nodig (GitHub en Vercel heb je al):

1. **GitHub** — waar de code staat
2. **Vercel** — waar de website draait (gratis niveau is ruim voldoende voor een wijk)
3. **Anthropic** (console.anthropic.com) — alleen nodig voor de optionele
   AI-spellingcontrole. Zonder deze stap werkt de rest gewoon, alleen wordt
   tekst dan nooit automatisch gecorrigeerd.

---

## Stap 1 — Code naar GitHub

1. Ga naar github.com → **New repository** → geef een naam, bijv. `wijkkrant`.
   Zet hem gerust op **Private**.
2. Pak deze hele map uit op je computer.
3. Op de nieuwe, lege GitHub-pagina zie je een link **"uploading an existing
   file"** — klik daarop en sleep de hele inhoud van de map naar binnen
   (alle mapjes zoals `app`, `lib`, `components`, en de bestanden
   `package.json`, `.gitignore`, enz.).
4. Klik **Commit changes**.

   *(Werkt slepen niet lekker in je browser? Installeer dan
   [GitHub Desktop](https://desktop.github.com/) — daarmee kun je de map
   in twee klikken publiceren.)*

## Stap 2 — Project importeren in Vercel

1. Log in op vercel.com → **Add New → Project**.
2. Kies je zojuist aangemaakte `wijkkrant` GitHub-repository → **Import**.
3. Vercel herkent automatisch dat het een Next.js-project is. Klik nog
   niet op Deploy — eerst de opslag instellen (stap 3), anders mist de
   site straks de database.

## Stap 3 — Opslag toevoegen (verplicht)

Ga in je Vercel-project naar het tabblad **Storage**:

1. **Create Database → KV (via Upstash)** — dit is waar alle ingezonden
   stukjes en het wachtwoord in bewaard worden. Volg de stappen en
   **koppel** de database aan je `wijkkrant`-project.
2. **Create Database → Blob** — dit is waar de foto's worden opgeslagen.
   Ook deze koppelen aan het project.

Vercel voegt hierdoor zelf een aantal omgevingsvariabelen toe
(`KV_...` en `BLOB_READ_WRITE_TOKEN`) — daar hoef je verder niets voor te
doen.

## Stap 4 — Omgevingsvariabelen instellen

Ga naar **Settings → Environment Variables** van je project en voeg toe:

| Naam | Waarde |
|---|---|
| `ADMIN_PASSWORD` | Een wachtwoord naar keuze voor de redactiepagina, bijv. `WijkDenHaag2025!` |
| `ANTHROPIC_API_KEY` | Jouw API-key van console.anthropic.com (alleen nodig voor de spellingcontrole-functie) |

*Wachtwoord later vergeten of willen wijzigen? Dat kan gewoon later in de
redactiepagina zelf, zonder hier iets aan te passen.*

## Stap 5 — Deployen

Klik nu op **Deploy**. Na ongeveer een minuut krijg je een link zoals
`wijkkrant-iets.vercel.app` — dat is je nieuwe, online wijkkrant. Deel deze
link met de wijk (of ga meteen door naar stap 6 voor een eigen naam).

Test even:
- Open de link → ga naar **Iets insturen** → stuur een testbericht met foto.
- Ga naar **Redactie** → log in met je `ADMIN_PASSWORD` → keur het testbericht
  goed → check of het nu op de hoofdpagina staat.

## Stap 6 — Eigen domeinnaam koppelen

Heb je (straks) een domeinnaam gekocht?

1. Ga in Vercel naar **Settings → Domains** → vul je domeinnaam in.
2. Vercel laat precies zien welke DNS-instelling je bij je domeinregistrar
   (waar je het domein kocht) moet invullen. Meestal is dat één regel.
3. Na een paar minuten tot een paar uur werkt je eigen domeinnaam.

## Hoe werkt de AI-spellingcontrole?

Bij het insturen staat een aanvinkvakje: *"Laat AI mijn tekst controleren
op spelling en grammatica"*. Staat het aan, dan wordt vlak voor het
opslaan alleen de spelling/grammatica gecorrigeerd door AI — de inhoud,
toon en taal blijven exact hetzelfde. Leden die dit niet willen, vinken
het gewoon uit. In de redactiepagina zie je of een bijdrage AI-gecontroleerd
is, en je kunt de tekst altijd zelf nog aanpassen voor je hem plaatst.

## Kosten

- Vercel gratis niveau (Hobby): ruim voldoende voor een wijkkrant.
- Vercel KV en Blob: hebben ook een gratis niveau, ruim genoeg voor tekst
  en een paar honderd foto's.
- Anthropic API: reken op enkele centen per maand bij normaal gebruik
  (alleen kleine tekstjes worden gecontroleerd).

## Later iets aanpassen?

Categorieën, kleuren, teksten of het gedrag van de site aanpassen kan
altijd — kom terug in dit gesprek en vraag het, of geef aan wat je anders
wilt. De code staat overzichtelijk in losse bestanden per onderdeel
(`app/page.js` = openbare pagina, `app/submit/page.js` = insturen,
`app/admin/page.js` = redactie, `lib/categories.js` = de categorieën en
kleuren).
