# Ananas Price Tracker

Prati cene proizvoda sa [ananas.rs](https://ananas.rs) i šalje mejl kada cena padne
ili dostigne zadatu ciljnu cenu.

- **Web:** Next.js 16 (App Router, TypeScript, Tailwind v4) → Vercel
- **Baza / Auth:** Supabase (Postgres + Auth + RLS)
- **Scraper:** Python 3 → GitHub Actions cron
- **Notifikacije:** Gmail SMTP iza `Notifier` interfejsa

---

## Status

| # | Feature | Stanje |
|---|---------|--------|
| — | Scaffold + schema (migracije) | ✅ |
| 1 | Auth: sign up / log in / log out | ✅ |
| 2 | Pretraga ananas.rs sa početne | ✅ |
| 3 | "Prati ovo" + limit od 3 proizvoda | ✅ |
| 4 | Dashboard sa istorijom cena | ✅ |
| 5 | Python scraper + GitHub Actions + mejl | ✅ |
| 6 | `is_admin` poštovan svuda | ✅ |

Ostalo: deploy na Vercel, i vizuelni prolaz sa `design-motion-principles`.

---

## Setup

### 1. Napravi Supabase projekat

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   Region: **Frankfurt (eu-central-1)** je najbliži Srbiji.
2. Zapamti *database password* koji ti pokaže — treba samo ako budeš koristio CLI.

### 2. Pusti migraciju

**Varijanta A — SQL editor (najbrže):**
Otvori **SQL Editor** u dashboardu i pokreni fajlove iz `supabase/migrations/`
**redom po imenu**, jedan po jedan:

1. `20260906120000_init.sql` — tabele, RLS, trigeri
2. `20260906180000_fix_users_update_policy.sql` — popravlja rekurziju u
   `users_update_own` (bez ovoga svaki `UPDATE` nad `users` puca sa `42P17`)
3. `20260906190000_limit_on_reactivate.sql` — limit se proverava i pri
   reaktivaciji pauziranog proizvoda, ne samo pri insertu

**Varijanta B — Supabase CLI:**

```bash
npx supabase link --project-ref <tvoj-project-ref>
npx supabase db push
```

Provera da je prošlo — u **Table Editor** treba da vidiš `users`,
`tracked_products` i `price_history`, sve tri sa `RLS enabled`.

### 3. Podesi Auth

**Authentication → Sign In / Providers → Email:**

- *Confirm email* — ostavi uključeno za produkciju. Za brže lokalno testiranje
  ga isključi, pa se posle sign-upa odmah dobija sesija.

**Authentication → URL Configuration:**

- *Site URL:* `http://localhost:3000` (posle deploya: tvoj Vercel domen)
- *Redirect URLs:* dodaj `http://localhost:3000/auth/confirm`
  i `https://<tvoj-domen>/auth/confirm`

### 4. Env varijable

```bash
cp .env.local.example .env.local
```

Popuni iz **Project Settings → API**:

| Varijabla | Odakle |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) |

`.env.local` je u `.gitignore`. `service_role` ključ **ne ide** u web aplikaciju —
treba samo scraperu.

### 5. Pokreni

```bash
npm install
npm run dev
```

→ [localhost:3000](http://localhost:3000)

### 6. Napravi sebi admin nalog

Registruj se kroz aplikaciju, pa u **SQL Editor**:

```sql
update public.users set is_admin = true where email = 'tvoj@email.com';
```

`is_admin` zaobilazi i RLS politike i limit od 3 proizvoda.

---

## Arhitektura

```
app/
  page.tsx               početna: pretraga + rezultati
  auth/actions.ts        server actions: signIn / signUp / signOut
  auth/confirm/route.ts  landing za link iz mejla (verifyOtp)
  actions/tracking.ts    trackProduct / stopTracking / setTargetPrice
  login/  signup/        forme
  dashboard/             zaštićeno: lista, sparkline, ciljna cena
components/
  auth-form.tsx          deljena forma za login i signup
  site-header.tsx        nav sa stanjem prijave
  product-card.tsx       rezultat pretrage (slot za akciju)
  track-button.tsx       "Prati ovo" + poruke o limitu
  price-sparkline.tsx    inline SVG istorije cene
lib/
  auth.ts                getCurrentUser / requireUser — jedini ulaz do user reda
  tracking.ts            upiti nad tracked_products (RLS ih sam ograničava)
  ananas/search.ts       parser stranice pretrage ananas.rs
  format.ts              RSD i datumi u sr-RS
  supabase/server.ts     server klijent (per-request, nikad modul-level)
  supabase/session.ts    refresh tokena + route guard
  database.types.ts      tipovi šeme
proxy.ts                 Next 16 naziv za middleware
scraper/                 Python worker (vidi niže)
supabase/migrations/     šema + RLS
.github/workflows/       cron za scraper
```

### Auth

Dva sloja, namerno:

- `proxy.ts` radi *optimistic* proveru — preusmerava neulogovane sa `/dashboard`
  i ulogovane sa `/login`. Jeftino, ali router nije mesto za autorizaciju.
- `lib/auth.ts` je prava provera, uz same podatke. Sve što čita ili piše
  korisničke podatke ide kroz `requireUser()`.

Svuda se koristi `getUser()`, ne `getSession()` — `getUser()` proverava token
kod auth servera umesto da veruje kolačiću koji klijent može da falsifikuje.

### Limit od 3 proizvoda

Invarijanta pripada bazi, pa je tamo i sprovedena: triger
`enforce_tracking_limit` na `tracked_products`, koji propušta `is_admin` i
`is_paid` naloge. Broj živi na jednom mestu — `public.free_plan_limit()`.

Triger je `BEFORE INSERT OR UPDATE OF is_active`, ne samo `INSERT`. „Prestani da
pratiš" pauzira red umesto da ga briše (istorija cena preživi), pa je ponovno
praćenje UPDATE — koji bi inače prošao neproveren i doveo korisnika na četiri
aktivna proizvoda.

Aplikacija ne duplira broj: pokuša upsert, i tek kad triger odbije pozove
`free_plan_limit()` da sastavi poruku. Jedan izvor istine, a dodatni round-trip
se dešava samo na putanji greške.

### Plaćanje

`is_paid` je jedini flag koji bilo šta proverava. Kada dođe Paddle ili
Lemon Squeezy, njihov webhook ga okrene — bez izmene šeme. Podaci specifični za
procesora (customer id, subscription id) idu u zasebnu `subscriptions` tabelu
kad zatreba, pa `users` ostaje netaknuta.

---

## Scraping — šta je provereno na živom sajtu

Provereno 2026-09-06, pre pisanja koda:

- **`robots.txt`** zabranjuje `/en/`, `/sr/`, `/tmp/image-thumbnails/`, `/assets/`.
  Putanje koje koristimo (`/search`, `/proizvod/...`) su dozvoljene.
- **Pretraga:** `https://ananas.rs/search?query=<term>`
  (`/pretraga` → 404, `?q=` → 502). Stranica je server-rendered i u HTML-u nosi
  ceo Algolia payload: `price`, `basePrice`, `discountPercentage`,
  `product.name`, `product.slug`, `product.coverImageUrl`, `product.brand`,
  `onStock`, `objectID`. 48 rezultata po strani.
- **Product URL:** `https://ananas.rs/proizvod/{slug}/{objectID}`
- **Cena proizvoda:** JSON-LD `<script type="application/ld+json">` sa
  `"@type":"Product"`, `"price"`, `"priceCurrency":"RSD"`, `availability`.

**Playwright nije potreban** — cena je u sirovom HTML odgovoru na obe stranice.

Web aplikacija parsira pretragu (TypeScript), scraper parsira product stranice
(Python). To nisu dva parsera istog — dve različite stranice sa različitim
formatima, svaki tamo gde se koristi.

**Slike** se prikazuju običnim `<img>`, ne kroz `next/image`. `next/image`
proksira kroz naš server, čime bi **mi** povlačili `ananas.rs/assets/` — putanju
koju njihov robots.txt zabranjuje. Običan tag je zahtev posetiočevog browsera.

---

## Scraper

```
scraper/
  run.py          orkestracija: petlja, pauze, obrada gresaka, sumarni log
  ananas.py       fetch_price(url) -> ScrapedProduct (JSON-LD)
  store.py        Supabase REST preko service_role kljuca
  notifier.py     Notifier (ABC) + GmailNotifier + ConsoleNotifier
  requirements.txt
```

### Lokalno

Na ovoj mašini Python je dostupan samo kao `py` (ne `python`):

```bash
cd scraper
py -m pip install -r requirements.txt
cp ../.env.local.example .env      # otkomentariši SUPABASE_* i GMAIL_* linije
py run.py --dry-run                # skuplja cene, ali ne šalje mejl
py run.py                          # pravi prolaz
```

### GitHub Actions

`.github/workflows/scrape.yml` — na svakih 6 sati (`17 */6 * * *`), plus ručno
preko **Actions → Scrape prices → Run workflow** (ima i `dry_run` čekboks).

Dodaj u **Settings → Secrets and variables → Actions**:

| Secret | Vrednost |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key (`sb_secret_...`) |
| `RESEND_API_KEY` | `re_...` — ako se koristi Resend |
| `MAIL_FROM` | `Ananas Tracker <alerts@tvoj-domen.rs>` |
| `GMAIL_ADDRESS` | Gmail adresa (fallback kanal) |
| `GMAIL_APP_PASSWORD` | App Password bez razmaka |

### Izbor kanala za mejl

`run.py` bira kanal iz onoga što je podešeno, bez izmene koda:

| Uslov | Kanal |
|---|---|
| `RESEND_API_KEY` postoji | **Resend** (traži i `MAIL_FROM`) |
| inače | Gmail SMTP |
| `--dry-run` | ništa se ne šalje, samo se ispisuje |

**Zašto Resend.** Gmail može da šalje samo kao lična adresa, dok linkovi vode
na drugi domen — to je obrazac koji filteri čitaju kao phishing, i zato mejlovi
završavaju u spamu. Sa sopstvenim domenom pošiljalac i link dele domen, SPF,
DKIM i DMARC se poklapaju, i mejl ide u inbox.

**Podešavanje:**

1. [resend.com](https://resend.com) → **Domains** → **Add Domain** → unesi svoj domen
2. Resend ispiše tri DNS zapisa (SPF, DKIM, DMARC) — dodaj ih kod registrara
3. Sačekaj verifikaciju (obično par minuta), pa **API Keys** → **Create**
4. Ubaci `RESEND_API_KEY` i `MAIL_FROM` u GitHub Actions secrets

**Bez domena** možeš da testiraš sa `MAIL_FROM=onboarding@resend.dev`, ali taj
pošiljalac šalje **isključivo na adresu vlasnika Resend naloga**. Dobro za
proveru da integracija radi, neupotrebljivo za prave korisnike.

**Supabase potvrdni mejlovi** su zasebna stvar — oni ne prolaze kroz `run.py`.
Za njih u **Project Settings → Authentication → SMTP Settings** upiši
`smtp.resend.com`, port `465`, username `resend`, password isti API ključ.

### Kada se šalje mejl

Samo kada cena **stvarno padne** u odnosu na prethodno zabeleženu. Slanje na
uslov „cena je ispod cilja" bi mejlovalo korisnika svakih 6 sati dok god cena tu
stoji — pad je događaj, jeftinoća je stanje. Ako je pad ujedno probio
`target_price`, to se pominje u mejlu i menja subject.

### Otpornost

- Jedan proizvod koji pukne se loguje i preskoči — prolaz ide dalje.
- 404 na product stranici gasi praćenje (`is_active = false`), istorija ostaje.
- Neuspelo slanje mejla ne poništava već upisanu cenu.
- Ako **svi** proizvodi puknu, izlazni kod je 1 i Actions run pocrveni — to
  znači redizajn sajta ili loše kredencijale, ne loš proizvod.
- Pauza 1.5–3.5 s između zahteva, nasumična da fiksni cron ne udara u istom
  ritmu.

---

## Deploy na Vercel

1. Import repozitorijuma na Vercel.
2. Environment Variables: `SUPABASE_URL` i
   `SUPABASE_PUBLISHABLE_KEY`. Service role ključ **ne ide ovde** —
   web aplikacija ga ne koristi.
3. Supabase → Authentication → URL Configuration: dodaj
   `https://<domen>/auth/confirm` u *Redirect URLs*, i prebaci *Site URL* na
   produkcijski domen.
