# viralgta6.com — gratis online zetten

Elke ochtend om 06:00 haalt GitHub zelf de virale video's van vandaag op (YouTube, TikTok, Instagram) en zet ze in `data/videos.json`. De site laat die lijst zien. Alles draait gratis:

| Onderdeel | Dienst | Kosten |
|---|---|---|
| Website | GitHub Pages | gratis |
| Elke ochtend ophalen | GitHub Actions | gratis (openbare repository) |
| YouTube trending | YouTube Data API | gratis (10.000 punten per dag, gebruik ±10) |
| TikTok + Instagram | Apify, gratis abonnement | gratis ($5 tegoed per maand, **geen betaalkaart toevoegen**) |
| Domein | viralgta6.com | heb je al |

## Wat staat waar

- `index.html` — de site
- `data/videos.json` — de lijst van vandaag (wordt elke ochtend vervangen)
- `scripts/fetch.mjs` — haalt de video's op
- `.github/workflows/daily.yml` — zegt tegen GitHub: elke ochtend om 05:00 UTC draaien
- `CNAME` — koppelt viralgta6.com aan de site
- `.nojekyll` — leeg bestand, zorgt dat GitHub alle bestanden gewoon serveert

## Stap 1 — Sleutels klaarzetten (niet in de chat plakken)

1. **YouTube-sleutel:** zie de uitleg eerder (console.cloud.google.com → YouTube Data API v3 → API-sleutel). Bij *API-beperkingen* alleen YouTube Data API v3 aanvinken.
2. **Apify-token:** console.apify.com → linksonder **Settings** → **API & Integrations** → kopieer de *Personal API token*.

## Stap 2 — GitHub

1. Maak een gratis account op **github.com** (eigen account, los van Craftly).
2. Rechtsboven **+** → **New repository**. Naam: `viralgta6`. Zet hem op **Public** (gratis Pages en Actions; je sleutels blijven geheim, die staan niet in de bestanden). Klik **Create repository**.
3. Klik op **uploading an existing file** en sleep **de inhoud** van de map `D:\Demy\viralgta6` erin (dus `index.html`, `CNAME`, `.nojekyll` en de mappen `data`, `scripts`, `.github`). Klik **Commit changes**.
4. Controleer dat de map `.github/workflows/daily.yml` er staat. Mist hij: **Add file → Create new file**, typ als naam `.github/workflows/daily.yml` en plak de inhoud van dat bestand.

## Stap 3 — Sleutels in GitHub zetten

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- Naam `YT_KEY`, waarde: je YouTube-sleutel
- Naam `APIFY_TOKEN`, waarde: je Apify-token

## Stap 4 — Website aanzetten

1. Repository → **Settings** → **Pages**.
2. Bij *Source*: **Deploy from a branch**, branch **main**, map **/ (root)** → **Save**.
3. Bij *Custom domain*: `viralgta6.com` → **Save**.

## Stap 5 — Domein koppelen (bij je domeinprovider)

Zet bij de DNS-instellingen van viralgta6.com:

| Type | Naam | Waarde |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<jouw-github-naam>.github.io` |

Haal oude A-records voor @ weg. Het kan tot een paar uur duren. Daarna in GitHub → Settings → Pages: **Enforce HTTPS** aanvinken.

## Stap 6 — Eerste keer handmatig draaien

Repository → **Actions** → **Daily viral videos** → **Run workflow**. Na ±2 minuten staat de eerste lijst online. Daarna gaat het elke ochtend vanzelf.

## Als er iets misgaat

- In **Actions** zie je per dag of het gelukt is. In `data/videos.json` staat onder `sources` per platform `ok: true` of de foutmelding.
- Lukt een platform een dag niet (bv. Apify-tegoed op), dan blijven de video's van gisteren staan.
- Minder of meer video's: in `daily.yml` onder `env:` kun je `TT_PER_HASHTAG`, `IG_PER_HASHTAG`, `TT_HASHTAGS`, `IG_HASHTAGS`, `YT_REGIONS` toevoegen. Standaard: TikTok 2×10, Instagram 2×5 per dag — ruim binnen het gratis tegoed.

## Lokaal openen

`index.html` dubbelklikken werkt ook: dan zie je Settings en Add video en kun je met je eigen YouTube-sleutel testen. Online zijn die knoppen verborgen en ziet iedereen de dagelijkse lijst.

## Instagram-post van de dag

Elke ochtend maakt GitHub ook een carrousel in de stijl van de site: 1 omslag + de top 5 (1080×1350 px) en `caption.txt` met alle credits en hashtags.

Ophalen: repository → **Actions** → bovenste run **Daily viral videos** → onderaan bij *Artifacts* **instagram-post** (zip). Slides in volgorde uploaden als carrousel, tekst uit `caption.txt` plakken. Wordt 14 dagen bewaard.

Let op: alleen de afbeelding van de video + credit, geen video van een ander opnieuw uploaden zonder toestemming van de maker.
