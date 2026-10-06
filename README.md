# Alpha Furnishings — website

A one-page, full-scroll furniture showcase and catalogue site for Alpha
Furnishings, plus an in-page admin panel to manage the product list. Built
with Node.js/Express.

## Run it

```
npm install
npm start
```

Then open http://localhost:4000

## Sections

Everything lives on one scrolling page (`public/index.html`) — the nav bar,
footer links, hero buttons and category tiles all smooth-scroll to a
section in place; nothing opens a new page or tab.

- **Home (`#home`)** — full-screen video hero. The video does not autoplay;
  its playhead is tied directly to scroll position, so scrolling down plays
  it forward and scrolling up rewinds it.
- **Collection (`#collection`)** — a live, real-time 3D render (Three.js) of
  a sofa you can drag to rotate and scroll to zoom, a 3D-rendering video of
  a chair concept, plus the four furniture categories.
- **Shop (`#shop`)** — the product catalogue, filterable by category, pulled
  live from the server. Each item links out to a WhatsApp enquiry or
  prefills the Contact section's quote request.
- **Contact (`#contact`)** — business info, hours, map link and an enquiry
  form. Submissions are saved to `data/enquiries.json` and visible in the
  admin panel.
- **Admin** — the "Admin" footer link opens the login/dashboard as an
  overlay on the same page (no navigation). Log in to add, edit or remove
  products, and to view enquiries submitted through the contact form.

Old URLs like `/shop` or `/admin-login` still work — they redirect to the
matching section on the single page, in case anything has them bookmarked.

## Admin login

Default credentials (change these before putting the site online):

```
Username: alpha
Password: alpha123
```

These are stored — hashed — in `data/admin.json`, which is created
automatically the first time the server runs. After that, `data/admin.json`
is the source of truth (so a password reset via "Forgot password?" survives
a restart); the `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars only seed it
the very first time.

Also set a real `SESSION_SECRET` environment variable in production —
the code falls back to a placeholder if it isn't set.

### Forgot password

Clicking "Forgot password?" on the admin login sends a 6-digit code to a
recovery email (`kaudeore2000@gmail.com` by default — override with
`RECOVERY_EMAIL`), then lets you verify the code and set a new password.

To actually send that email, set these environment variables before
starting the server:

```
SMTP_USER=youraddress@gmail.com
SMTP_PASS=your-16-character-gmail-app-password
```

A Gmail App Password needs 2-Step Verification turned on for that Google
account — generate one at https://myaccount.google.com/apppasswords (a
normal Gmail password won't work here). Until these are set, the server
prints the code to its console instead of emailing it, so you can still
test the flow locally. See `lib/mailer.js` for details and optional
`SMTP_HOST` / `SMTP_PORT` overrides.

## How the data is stored

There's no database — products, enquiries and admin credentials live in
JSON files:

- `data/products.json`
- `data/enquiries.json`
- `data/admin.json` (created automatically)

The admin panel reads and writes these files directly. This is intentionally
simple for a single-showroom site; if you outgrow it, swap `lib/store.js`
for a real database without touching the routes or front end. Password-reset
codes themselves are kept in memory only (not written to disk) and expire
after 10 minutes.

## Content notes

- The three prices carried over from the current site (Wardrobe, Office
  Table, Queen Size Bed) are used as given. Everything else in the starter
  catalogue is marked "price on request" rather than guessed — add real
  prices for those from the admin panel whenever you're ready.
- Phone, email, address and hours are taken from the business profile
  provided. Re-confirm these (and the Google review count) before treating
  this as the final live site, since the source document noted they can
  change.
- There's no payment/checkout flow — the catalogue leads to WhatsApp
  enquiries and quote requests, matching how the business currently
  converts visits into showroom sales.

## Stack

Express (server), vanilla JS + GSAP/ScrollTrigger + Lenis (smooth scroll)
on the front end, and Three.js for the Collection section's 3D render. No
build step — everything in `public/` is served as-is.
