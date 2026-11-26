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
  index.html          the page
  index.md            the same content as Markdown, for AI assistants
  llms.txt            entry point for AI assistants
  meeting-rooms/      members' booking calendars (Outlook embeds); not linked from the page, not indexed
  404.html
  robots.txt, sitemap.xml
  assets/
    style.css, icons.svg, fonts/, img/
```

Notes:

- `meeting-rooms/` replaces Carrd's hidden section `#ljmeetingrooms`. A small script in `index.html` sends old `lj.auroracoworking.com/#ljmeetingrooms` links there, so existing links and QR codes keep working.
- The membership buttons open the Microsoft Form (`forms.office.com/e/ndv7CxrEqY`). The form stays in Microsoft 365, and the site only links to it.

## Working on it

Preview locally from the repo root (root-relative links need a server, not a double-click on the file):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Then commit and push to `main`. Before pushing, open the page at a phone width too (browser dev tools), and check the `.md` twin matches.

## Hosting (not decided yet)

The plan is to keep the files here and serve them from Cloudflare Pages connected to this repo (no build command, output directory `/`). GitHub Pages would also work as-is. DNS stays at FreeDNS: switching a site over is one CNAME change, and Jose does that as the last step, once a site is approved.

## Content known to be outdated (left as on Carrd for now)

- Celje is closed but still listed as a location.
- The footer still credits Lincoln Island Initiatives.
- The member gallery may not match who is in the building today.
