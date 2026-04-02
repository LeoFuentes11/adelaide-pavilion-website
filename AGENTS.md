# AGENTS.md — Adelaide Pavilion

## Project Overview

Static HTML/CSS/JS site for Adelaide Pavilion (wedding/event venue, Adelaide SA). Deployed on Vercel.
No build step — all files served directly. CMS: Decap CMS at `/admin`. Contact form: serverless function.

---

## Build / Preview Commands

This project has **no build step** and **no test suite**. No commands to run.

To preview locally:
```bash
npx serve .
# or
python -m http.server 8000
```

To run the Vercel dev server (includes API routes):
```bash
npx vercel dev
```

---

## Project Structure

```
site trial/
├── index.html            # Home
├── about.html            # About / history
├── weddings.html         # Weddings
├── corporate.html        # Corporate events
├── social.html          # Social events
├── packages.html         # Packages & pricing
├── gallery.html          # Photo gallery
├── contact.html          # Contact / enquiry form
├── css/style.css         # All styles (CSS custom properties)
├── js/
│   ├── main.js           # Nav, lightbox, animations, tabs, form, accordion
│   └── cms-loader.js     # Fetches _data/*.json, injects into [data-cms] elements
├── _data/                # CMS-editable content (JSON)
│   ├── contact.json, homepage.json, about.json, weddings.json,
│   ├── corporate.json, social.json, packages.json, menus.json
│   └── testimonials/, gallery/  (created by Decap CMS)
├── admin/config.yml      # Decap CMS collection definitions
├── vercel.json           # Vercel routing config
├── api/
│   ├── contact.js        # Contact form handler (primary)
│   ├── auth.js           # Decap CMS OAuth
│   └── callback.js       # Decap CMS OAuth callback
└── netlify/             # Legacy Netlify files (deprecated, not used)
```

---

## Code Style

### General

- Plain HTML/CSS/JS only — no framework, no bundler, no TypeScript
- Keep files small and single-purpose
- Add a file header comment on new `.js` files (see existing files for format)

### JavaScript Conventions

- **Browser JS** (`js/main.js`, `js/cms-loader.js`): Use modern ES6+
- **Serverless functions** (`api/`): Node.js CommonJS, `'use strict'`
- **Naming**: camelCase for variables/functions, PascalCase for classes, SCREAMING_SNAKE_CASE for constants
- **Async/await**: Always prefer over raw Promises; use try/catch/finally for network calls
- **DOM queries**: Cache elements, use `?.` chaining for optional elements
- **No `innerHTML`** with user-supplied data (only CMS-controlled fields via `data-cms-html`)
- **Optional chaining**: Use `?.` freely — project targets modern browsers only
- **Comments**: JSDoc for exported functions and complex logic; inline comments for non-obvious decisions

### CSS Conventions

- **CSS custom properties** for all brand colors (see `--green`, `--gold`, etc. in `style.css`)
- **BEM-lite naming**: `.block`, `.block-element`, `.block--modifier`
- **Section separator comments**: `/* ---------- Section Name ---------- */`
- **Utility classes**: Single-purpose (`.mt-16`, `.mb-24`, etc.) — do not invent new ones unless necessary
- **Responsive**: Mobile-first breakpoints (`@media(max-width:768px)` then larger sizes)
- **No Tailwind** — existing plain CSS only

### HTML Conventions

- Semantic elements (`<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- Data attributes for JS hooks: `data-cms`, `data-cms-html`, `data-cms-href`, `data-lightbox`, `data-tabs`, `data-delay`
- No inline styles except for dynamic values set by JS

---

## CMS / Content System

### `data-cms` Attribute API (in `js/cms-loader.js`)

| Attribute              | Behaviour                      | Safe for user input? |
|------------------------|--------------------------------|---------------------|
| `data-cms="key"`       | Sets `textContent`             | Yes                 |
| `data-cms-html="key"`  | Sets `innerHTML`               | **No — CMS only**   |
| `data-cms-href="key"`  | Sets `href` attribute          | **No — CMS only**   |
| `data-menu="key"`      | Renders menu array as `<div>`s | Yes (textContent)   |
| `data-bev="key"`       | Renders beverage list as `<li>`| Yes (textContent)   |

### Rules
- Never use `data-cms-html` or `data-cms-href` for user-supplied or dynamic content
- Menu renderers use `textContent` only — safe by design

---

## Serverless Function Conventions (`api/`)

### Security Requirements (NEVER bypass)

1. **Input validation**: Use allowlists (Sets) for enum fields. Strict regex for names, email, phone.
2. **Sanitization**: Strip `<>` for XSS, strip `\r\n\t` for header injection. Cap lengths.
3. **Rate limiting**: 3 submissions/IP/hour (in-memory Map — survives warm calls)
4. **Turnstile**: Verify `cf-turnstile-response` token server-side before processing
5. **CSRF**: Validate `Origin`/`Referer` header against `ALLOWED_ORIGIN` env var
6. **Secrets**: Read from `process.env` only — never hardcode API keys
7. **Error messages**: Return generic messages to client. Log details server-side only.
8. **Structured logs**: Log metadata only (IP, timestamp, email domain, event type) — never log message body

### Environment Variables (set in Vercel dashboard)

| Variable             | Purpose                        |
|----------------------|--------------------------------|
| `TURNSTILE_SECRET_KEY`| Cloudflare Turnstile verification |
| `RESEND_API_KEY`     | Email delivery via Resend API  |
| `ALLOWED_ORIGIN`     | CSRF allowlist (live domain)   |
| `GITHUB_CLIENT_ID`    | Decap CMS OAuth               |
| `GITHUB_CLIENT_SECRET`| Decap CMS OAuth               |

---

## Brand Colors (CSS Custom Properties)

| Variable       | Hex       | Usage                              |
|----------------|-----------|-------------------------------------|
| `--green`      | `#1A5FAD` | Primary — headers, buttons          |
| `--green-light`| `#2B77CC` | Hover states                       |
| `--gold`       | `#3EAEE0` | Sky blue accent — labels, prices    |
| `--gold-dark`  | `#2A97CC` | Hover states                       |
| `--brown`      | `#5EC6ED` | Light accent                       |
| `--ivory`      | `#EDF5FC` | Pale section backgrounds           |
| `--cream`      | `#DDF0FA` | Alternate section backgrounds       |
| `--charcoal`   | `#1A2A3D` | Dark navy — body text              |

---

## Git / Commit Checklist

Before every commit:
- [ ] No `.env`, `*.pem`, `*.key`, or secrets files staged (`git status`)
- [ ] No API keys or credentials in any changed file
- [ ] Server-side validation in `api/contact.js` unchanged or strengthened
- [ ] Client-side validation in `js/main.js` is UX-only (never trust it for security)

---

## Important File Locations

| Purpose                        | File                              |
|--------------------------------|-----------------------------------|
| Contact form handler           | `api/contact.js`                  |
| CMS content loader             | `js/cms-loader.js`                |
| All styles                     | `css/style.css`                   |
| Decap CMS config               | `admin/config.yml`                |
| Vercel routing                | `vercel.json`                     |
| Contact data (phone, address)  | `_data/contact.json`              |
