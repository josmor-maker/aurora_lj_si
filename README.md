# Aurora Coworking Ljubljana — lj.auroracoworking.com

The source for the Aurora Coworking Ljubljana website, rebuilt from the Carrd export (November 2026).

**Status:** not live yet. DNS still points to Carrd; Jose switches it as the last step.

One repo per site: the network home page (www) and Murska Sobota (ms) will get their own repos when they move off Carrd.

## The standard

The site follows these rules (the same standard as jose.morales.si):

- **Plain HTML and CSS.** No CMS, no framework, no build step. What's in the folder is exactly what gets served.
- **Self-hosted fonts and images.** Nothing loads from Google Fonts or Carrd. Fonts are in `assets/fonts/`, images in `assets/img/` with readable names.
- **Readable by AI assistants.** Each page has a Markdown twin (`index.md`) with the same content, linked from the HTML `<head>`, and each site has an `llms.txt` that points to it. **When you change text on a page, change the `.md` twin too.**
- **Structured data.** `index.html` has a JSON-LD block (address, contact, links). Keep it in sync with the page.
- **Brand.** Aurora yellow `#F2A81D` for buttons, navy `#2A2D40` for headings. Fonts: Merriweather Sans (headings), Poppins (labels), Inter (body). All colours are variables at the top of `assets/style.css`.

## What's in the repo

```
  index.html              home: space, 3D map, prices, members + projects, location, first-visit form, FAQ
  index.md                the same content as Markdown, for AI assistants
  coworking-ljubljana/    SEO pages (each with an index.md twin)
  hot-desk-ljubljana/
  meeting-room-ljubljana/
  digital-nomads-ljubljana/
  sl/                     Slovenian page with the first-visit form
  meeting-rooms/          members' booking calendars (Outlook embeds); not indexed
  worker.js               Cloudflare Worker: only handles POST /api/first-visit (the form)
  llms.txt, robots.txt, sitemap.xml, 404.html
  assets/
    style.css, icons.svg, fonts/, img/
    img/illustrations/    on-brand line illustrations (made with ProductAI from the Ljubljana badge)
    js/site.js            nav, scroll reveal, first-visit form (+ .ics calendar file)
    js/space-map.js       the 3D map (three.js, loaded only when the map scrolls into view)
    data/desks.json       desk clusters and which desks are fixed: edit this to update the map
    vendor/               three.js r170 (MIT)
```

### Updating the desk map

Open `assets/data/desks.json`. Each cluster is 4 desks; set `true` for a desk a fixed member uses. Free desks show yellow with a FLEX card. Change `updated`, commit, push.

### Members and "what they're working on"

Both lists are plain HTML in `index.html` (`#members`). Add a member: photo in `assets/img/members/`, one `<li>`. Add a project: copy one `<a class="project">` card. Update `index.md` too.

### First-visit form email

The form posts to `/api/first-visit`, handled by `worker.js`, which emails the request via [Resend](https://resend.com). In Cloudflare (Workers > aurora-lj > Settings > Variables and secrets) set:

- `RESEND_API_KEY` (secret)
- `VISIT_FROM`, e.g. `Aurora Ljubljana <visits@auroracoworking.com>` (domain verified in Resend)
- `VISIT_TO` defaults to info@auroracoworking.com (in `wrangler.jsonc`)

Until those are set, the form still works: it opens the visitor's email app with the request filled in, addressed to info@auroracoworking.com.

## Working on it

Preview locally from the repo root (root-relative links need a server, not a double-click on the file):

```sh
python3 -m http.server 8000
# open http://localhost:8000  (the form falls back to email locally; run `npx wrangler dev` to test the Worker)
```

Then commit and push to `main`. Before pushing, open the page at a phone width too (browser dev tools), and check the `.md` twin matches.

## Hosting

Cloudflare Workers (static assets), connected to this repo. Every push to `main` deploys automatically; other branches get their own preview URL.

- `wrangler.jsonc`: Cloudflare's config. Serves the repo root as-is, no build step; unknown paths show `404.html`.
- `.assetsignore`: repo files that are not published (README, config).

DNS stays at FreeDNS: switching `lj.auroracoworking.com` over is one CNAME change, which Jose does as the last step once the site is approved. Until then the site is visible only on its `workers.dev` address.

## Content known to be outdated (left as on Carrd for now)

- The member gallery may not match who is in the building today.
- The 3D map layout is drawn from photos, not a floor plan; desk numbers and fixed/free status in desks.json are placeholders.
