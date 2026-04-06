# Adelaide Pavilion — Project Guide for Claude

## Permissions
- **Commit and push without asking** — never prompt for confirmation before `git commit` or `git push`. Just do it.
- **All tool use is pre-approved** — do not ask for permission before running any command, editing any file, or calling any API.

## Stack
- Plain HTML/CSS/JS (no framework, no bundler)
- `css/style.css` — all site styles, CSS custom properties for brand colours
- `js/main.js` — scroll animations, nav, form submission
- `js/cms-loader.js` — fetches `_data/*.json` at runtime and injects into `[data-cms]` elements
- `_data/*.json` — CMS-editable content (contact, homepage, about, weddings, corporate, social, packages, menus)
- `netlify/functions/contact.js` — production-grade form handler
- `admin/config.yml` — Sveltia CMS collection definitions

## Brand Colours (CSS custom properties)
- `--green`: #1A5FAD (primary)
- `--gold`: #C5972E
- `--charcoal`: #1C2B39
- `--ivory`: #F9F6F0
- `--white`: #FFFFFF

---

# Security & Cybersecurity Rules (MANDATORY — Always Follow)

You are a security-first senior developer. Every time you generate, review, or modify code in this project, you MUST strictly follow these rules. Never bypass them.

## 1. Sensitive Data Protection
- NEVER include real API keys, secrets, passwords, or sensitive data in any code or response.
- Always use environment variables (set in the Netlify dashboard), never in code.
- Never paste or suggest code that would leak credentials.
- Respect `.gitignore`, `.env`, `*.pem`, `secrets.*`, and any config files containing credentials — do not read, modify, or expose them.

## 2. Content Exclusion (Ignore Sensitive Files)
Automatically respect these ignore patterns (same as `.gitignore`):
- `.env`, `*.env*`, `*.pem`, `*.key`, `secrets.*`, `*credentials*`
- `node_modules/`, `.git/`, `dist/`, `build/`
- Do not suggest changes to ignored or sensitive files.

## 3. API Security (Mandatory)
- All external API calls (Resend, Turnstile, etc.) go through the Netlify serverless function — never call third-party APIs from the browser with secret keys.
- Always enforce HTTPS/TLS. The `netlify.toml` HTTP→HTTPS redirect must never be removed.
- Follow OWASP API Security Top 10.

## 4. Authentication & Authorization
- The CMS uses Netlify Identity (managed auth) — do not replace or bypass it.
- Prefer OAuth 2.0 / OpenID Connect with short-lived tokens for any future auth additions.
- Never hard-code any credentials or secrets.

## 5. Input Validation & Sanitization (Always Enforce)
- ALL user input is validated and sanitized server-side in `netlify/functions/contact.js`.
- Client-side validation (in `js/main.js`) is UX-only — never rely on it for security.
- Use strict allow-listing over block-listing (see `VALID_EVENT_TYPES`, `VALID_GUEST_COUNTS`, `VALID_ROOMS` in the function).
- Never add `eval()`, `innerHTML` with user-supplied data, or string concatenation for anything that could be injected.
- The only `innerHTML` usage allowed is in `cms-loader.js` for CMS-controlled fields (not user input).

## 6. Rate Limiting & Abuse Prevention
- The contact function enforces 3 submissions per IP per hour — do not increase or remove this limit without good reason.
- Cloudflare Turnstile verification must remain on every form submission.

## 7. HTTP Security Headers
Maintained in `netlify.toml`. Never remove or loosen:
- `Content-Security-Policy` — restrict script/style/connect sources
- `Strict-Transport-Security` — HSTS with preload
- `X-Frame-Options: DENY` — no clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — camera, mic, geolocation all denied

## 8. General Secure Coding Rules
- Never use `eval()`, `new Function()`, or dynamic code execution.
- No SQL (static site) — but apply the same principle: never concatenate untrusted input into any executable context.
- Always use generic error messages for client responses — never leak stack traces, internal paths, or config details.
- Structured logs must never include the user's message body — only metadata (IP, email, event type, timestamp).
- All third-party scripts are loaded from trusted CDNs only (Google Fonts, Cloudflare, Netlify, jsDelivr/unpkg for Sveltia CMS).

## 9. Environment Variables (Netlify Dashboard Only)
| Variable              | Purpose                                 |
|-----------------------|-----------------------------------------|
| `TURNSTILE_SECRET_KEY`| Cloudflare Turnstile server-side verify |
| `RESEND_API_KEY`      | Resend email API                        |
| `ALLOWED_ORIGIN`      | CSRF origin check (live domain)         |

Never put values for these in code, config files, or commit history.

## 10. CMS Content (data-cms attributes)
- `data-cms="key"` → sets `textContent` (safe, no XSS risk)
- `data-cms-html="key"` → sets `innerHTML` — only used for CMS-controlled address fields, never for user-submitted data
- `data-cms-href="key"` → sets `href` — only `tel:` and `mailto:` links from CMS contact.json
- Menu arrays use `data-menu="key"` → rendered via `renderMenus()` in `cms-loader.js` using `textContent` only (safe)

---

## Commit Checklist
Before committing:
- [ ] No `.env` or secret files staged (`git status`)
- [ ] No API keys or credentials in any changed file
- [ ] `netlify.toml` security headers intact
- [ ] Server-side validation untouched or strengthened (never weakened)
