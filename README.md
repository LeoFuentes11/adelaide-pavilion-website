# Adelaide Pavilion — Website

A complete, production-ready static website for **Adelaide Pavilion**, the premium wedding and event venue in Veale Gardens, Adelaide SA.

---

## Project Structure

```
site trial/
├── index.html          ← Home page
├── about.html          ← About the Venue (history, rooms, team, location)
├── weddings.html       ← Weddings page
├── corporate.html      ← Corporate Functions page
├── social.html         ← Social Events page
├── packages.html       ← Packages & Pricing (tabbed — all menus & pricing)
├── gallery.html        ← Gallery with lightbox & category filters
├── contact.html        ← Contact / Enquiry form + FAQ
├── css/
│   └── style.css       ← All custom styles (brand palette, components)
├── js/
│   └── main.js         ← Navbar, lightbox, animations, tabs, form, accordion
├── images/             ← Place all photos here (see guide below)
│   └── gallery/        ← Gallery-specific photos
└── additonal info/     ← Original PDFs (wedding, event, corporate packages)
```

---

## Deployment

### Netlify (Recommended — Free)

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site" → "Deploy manually"**
3. Drag the entire `site trial` folder onto the deploy zone
4. Your site is live instantly at a `*.netlify.app` URL
5. Add your custom domain under **Site settings → Domain management**

**For the contact form on Netlify:**
- Add `name="contact"` to the `<form>` tag in `contact.html`
- Add `<input type="hidden" name="form-name" value="contact" />` inside the form
- Netlify will automatically detect and handle form submissions (free, up to 100/month)

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` from the project directory
3. Follow the prompts — your site deploys in seconds

### Traditional Web Hosting (cPanel, etc.)

1. Compress the project folder into a ZIP
2. Upload via FTP or cPanel File Manager to `public_html`
3. Unzip in place

---

## Image Replacement Guide

All images use the path `images/` from the site root. Replace the placeholder files with real photography. Recommended dimensions are listed for optimal performance.

### Root Images (used across pages)

| File | Used On | Recommended Size | Description |
|---|---|---|---|
| `images/hero-pavilion.jpg` | Home hero | 1920×1080px | Exterior or Parkview Room panoramic |
| `images/pavilion-interior.jpg` | Home welcome | 900×675px | Interior room with garden views |
| `images/weddings-card.jpg` | Home cards | 600×450px | Wedding table or couple |
| `images/corporate-card.jpg` | Home cards | 600×450px | Corporate setup |
| `images/social-card.jpg` | Home cards | 600×450px | Social celebration |
| `images/parkview-room.jpg` | Rooms section | 1200×900px | Parkview Room full view |
| `images/terrace-room.jpg` | Rooms section | 1200×900px | Terrace Room full view |
| `images/gallery-1.jpg` – `gallery-5.jpg` | Home gallery | 900×675px | Assorted venue/event shots |
| `images/cta-bg.jpg` | CTA banners | 1920×600px | Gardens or romantic aerial |
| `images/about-hero.jpg` | About hero | 1920×800px | Exterior or gardens |
| `images/about-venue.jpg` | About intro | 900×675px | Venue building |
| `images/about-history.jpg` | About timeline | 600×800px | Historical or current |
| `images/parkview-detail.jpg` | About rooms | 900×675px | Parkview detail view |
| `images/terrace-detail.jpg` | About rooms | 900×675px | Terrace Room detail |
| `images/cuisine.jpg` | About cuisine | 900×675px | Food presentation |
| `images/packages-hero.jpg` | Packages hero | 1920×800px | Table setting |
| `images/weddings-hero.jpg` | Weddings hero | 1920×1080px | Wedding reception full room |
| `images/weddings-cta.jpg` | Weddings CTA | 1920×600px | Romantic garden shot |
| `images/wedding-couple.jpg` | Weddings page | 600×800px | Couple portrait |
| `images/ceremony-garden.jpg` | Weddings garden | 600×800px | Ceremony site in gardens |
| `images/corporate-hero.jpg` | Corporate hero | 1920×800px | Corporate room setup |
| `images/corporate-interior.jpg` | Corporate page | 900×675px | Boardroom or conference |
| `images/social-hero.jpg` | Social hero | 1920×800px | Social event full room |
| `images/social-celebration.jpg` | Social page | 900×675px | Celebration table |
| `images/social-cta.jpg` | Social CTA | 1920×600px | Festive table or room |
| `images/gallery-hero.jpg` | Gallery hero | 1920×800px | Wide shot of venue |
| `images/contact-hero.jpg` | Contact hero | 1920×800px | Garden pathway or entrance |

### Gallery Images (`images/gallery/`)

| File | Category | Description |
|---|---|---|
| `wedding-reception-1.jpg` | Weddings | Full room reception setup |
| `wedding-couple-1.jpg` | Weddings | Couple portrait in gardens |
| `wedding-table-1.jpg` | Weddings | Table styling |
| `wedding-terrace-1.jpg` | Weddings | Terrace Room wedding |
| `wedding-cake-1.jpg` | Weddings | Wedding cake |
| `wedding-dance-1.jpg` | Weddings | First dance |
| `venue-parkview-1.jpg` | Venue | Parkview Room |
| `venue-terrace-1.jpg` | Venue | Terrace Room |
| `venue-exterior-1.jpg` | Venue | Exterior |
| `corporate-conference-1.jpg` | Corporate | Conference setup |
| `corporate-gala-1.jpg` | Corporate | Gala dinner |
| `corporate-networking-1.jpg` | Corporate | Networking event |
| `social-birthday-1.jpg` | Social | Birthday |
| `social-anniversary-1.jpg` | Social | Anniversary |
| `social-gala-1.jpg` | Social | Gala dinner |
| `cuisine-calamari-1.jpg` | Cuisine | Entrée dish |
| `cuisine-steak-1.jpg` | Cuisine | Main course |
| `cuisine-canapes-1.jpg` | Cuisine | Canapés |
| `gardens-roses-1.jpg` | Gardens | Rose garden |
| `gardens-ceremony-1.jpg` | Gardens | Ceremony site |
| `gardens-pergola-1.jpg` | Gardens | Wisteria Pergola |

**Tip:** All images can be named anything — just update the `src` attribute in the HTML. For best performance, compress images to ≤300KB using [Squoosh](https://squoosh.app) or [TinyPNG](https://tinypng.com).

---

## Contact Form Integration

The form in `contact.html` currently shows a success message on submit (client-side only). For real email delivery:

### Option 1: Netlify Forms (easiest)
Add to the `<form>` tag:
```html
<form id="enquiryForm" name="contact" method="POST" data-netlify="true">
  <input type="hidden" name="form-name" value="contact" />
```
Remove the `e.preventDefault()` from `js/main.js` submit handler.

### Option 2: Formspree (free tier, any host)
1. Sign up at [formspree.io](https://formspree.io)
2. Create a form and get your endpoint URL
3. Set `action="https://formspree.io/f/YOUR_ID"` and `method="POST"` on the form

### Option 3: EmailJS (no server needed)
1. Sign up at [emailjs.com](https://emailjs.com)
2. Add their CDN and call `emailjs.sendForm()` in the submit handler

---

## Fonts Used

All loaded via Google Fonts (CDN):
- **Playfair Display** — headings (elegant serif)
- **Cormorant Garamond** — body text (refined serif)
- **Great Vibes** — script/decorative accents
- **Lato** — UI text, labels, nav (clean sans-serif)

---

## Color Palette

Derived from the Adelaide Pavilion logo wave design.

| Variable | Hex | Usage |
|---|---|---|
| `--green` | `#1A5FAD` | Primary deep blue — headers, buttons, panels |
| `--green-light` | `#2B77CC` | Medium blue — hover states |
| `--gold` | `#3EAEE0` | Sky blue accent — labels, highlights, prices |
| `--gold-dark` | `#2A97CC` | Darker sky blue — hover states |
| `--brown` | `#5EC6ED` | Light accent blue — secondary accents |
| `--ivory` | `#EDF5FC` | Pale blue-white — section backgrounds |
| `--cream` | `#DDF0FA` | Ice blue — alternate section backgrounds |
| `--charcoal` | `#1A2A3D` | Dark navy — body text |
| Footer bg | `#071E42` | Deep navy — footer background |

---

## Customisation Notes

1. **Logo**: Replace the `AP` text emblem in `.nav-logo-emblem` with an `<img>` tag pointing to your logo file
2. **Pricing years**: Update package prices in `packages.html` and `index.html` each year
3. **SEO**: Update `<meta name="description">` on each page with current content
4. **Social links**: Update Facebook/Instagram URLs in all footers
5. **Phone/Email**: Search for `08 8212 7444` and `contact@adelaidepavilion.com.au` across all files if these change

---

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge). Uses CSS custom properties, CSS Grid, and IntersectionObserver — all widely supported since 2018+.

---

*Built for Adelaide Pavilion — Veale Gardens, Adelaide SA 5000*
