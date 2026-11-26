# Instructions for Claude: Aurora Coworking Ljubljana site

This repo is the live website for Aurora Coworking Ljubljana. Every push to `main` is deployed to Cloudflare automatically (Worker `aurora-lj`, currently at https://aurora-lj.josmor.workers.dev). Jose (owner) and Marko (Aurora member, volunteer) both push here.

## Before editing

- `git pull` first. Marko may have pushed since the last session.
- Read the README for the site standard.

## Rules

- Plain HTML/CSS only. No frameworks, build steps, CMS, trackers or external scripts/fonts. Assets stay self-hosted in `assets/`.
- **Every content change goes into both `index.html` and `index.md`** (the Markdown twin for AI assistants), and into the JSON-LD block in `index.html` and `llms.txt` when the change touches the address, contact details, prices or links.
- Keep Aurora's own look: yellow `#F2A81D`, navy `#2A2D40`, Merriweather Sans / Poppins / Inter. Not Jose's monochrome personal-site style.
- Use Jose's wording when he gives it. If you propose new wording, show it to him before publishing.
- Never use the word "entrepreneurial".
- `meeting-rooms/` holds members' booking calendars: not linked from the homepage, and not indexed (`robots.txt`, `noindex`).

## Publishing

- Small, clearly requested edits (a price, a name, removing a location): commit to `main` and push. Report what changed and give the live link.
- Larger changes (layout, new sections, rewrites): push to a branch instead. Cloudflare builds a preview URL for it. Merge to `main` only after Jose or Marko approves.
- Before pushing, preview locally (`python3 -m http.server` from the repo root) and look at the page at desktop and phone widths.
- Commit messages: plain English, what and why.

## Don't

- Don't touch DNS or the custom domain. Jose decides that separately (see README, Hosting).
- Don't change `wrangler.jsonc` or `.assetsignore` unless asked.
