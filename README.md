# Serika Wishlist

Wishlists from any store, live at **https://wish.serika.dev**. Shared lists use the short host
**https://wish.ado.wtf/w/&lt;slug&gt;**.

- **Serika accounts** sign in through [serika-accounts](https://accounts.serika.dev) (30-day
  sessions). This app never stores passwords.
- **Guests** can start a list with no account. Adding an email sends a magic link (single use,
  24 hours) that saves the list and works from any device; the guest session also lasts 30 days.
- **Guest lists move into an account** the first time someone signs in with a Serika account on
  the same, verified, address. Lists made as a guest in the same browser come along at sign-in.
- **Bookmarklet** (`/bookmarklet`): reads the product on any store page in the user's own browser
  (so stores that block servers still work) and opens a small popup to pick a list. On a Throne,
  MyWishlist or Wishlist.com list it imports the whole list.
- **Imports** (`/import`) from Throne, MyWishlist (mywishlist.online) and Wishlist.com.
- **Friends** are the shared Serika friends graph in serika-accounts (`/internal/graph`), so they
  are the same friends as on SerikaCord. Lists can be private, link only, friends only or public.
- **Gifting**: anyone with the link can mark a wish "I'm getting this". The owner never sees
  reservations unless they turn spoilers on.
- **Public API** for the SerikaCord profile widget, read-only and CORS-open.

## Stack

Next.js (App Router) · Postgres · Tailwind 4 · Amazon SES. Deployed on Coolify from the
Dockerfile; every push to `main` deploys. The schema creates itself on first query (`lib/db.ts`).

## Local development

```bash
npm install
cp .env.example .env     # DATABASE_URL, AUTH_INTERNAL_KEY, SES keys, APP_SECRET
npm run dev              # http://localhost:3710
```

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Main origin, e.g. `https://wish.serika.dev` (emails, bookmarklet) |
| `SHARE_URL` | Share-link origin, e.g. `https://wish.ado.wtf`. Only list and profile pages are served there |
| `DATABASE_URL` | Postgres connection string |
| `ACCOUNTS_URL` | serika-accounts base URL (defaults to production) |
| `AUTH_INTERNAL_KEY` | Service key for `/internal/*` on serika-accounts |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_EMAIL_DOMAIN` | Amazon SES (same account as serika.moe) |
| `EMAIL_FROM` | Sender (default `Serika Wishlist <wishlist@serika.email>`) |
| `APP_SECRET` | Salts magic-link and session token hashes |

Without SES keys, emails are printed to the server log instead of sent.

## Importing into an account from the command line

```bash
npm run import -- someone@example.com https://mywishlist.online/w/zpy1zk/wishlist [--public]
```

## Public API

All `GET`, `Access-Control-Allow-Origin: *`, cached for 5 minutes. Only lists marked **Public**
come out of the user endpoints; a link-only list can be fetched by its slug (having the link is
the permission). Reservations are never exposed.

| Endpoint | Returns |
| --- | --- |
| `/api/public/users/{accountsId}/wishlists?items=6` | `{ user, profileUrl, lists[] }` |
| `/api/public/users/by-username/{username}/wishlists?items=6` | same |
| `/api/public/lists/{slug}?items=12` | `{ list, user }` |

A list is `{ slug, title, emoji, description, url, itemCount, totalValue, updatedAt, items[] }`
and an item is `{ title, imageUrl, price, currency, url, store, priority, received }`.

## How imports read each site

| Site | How |
| --- | --- |
| MyWishlist | The list page embeds every product (`wishlist_products`). Click-out links are followed to the real store URL and affiliate wrappers are removed. |
| Throne | The creator profile API gives the creator id; items come from Throne's public Firestore `wishlistItems` collection, in Throne's order. |
| Wishlist.com | Behind a Cloudflare check, so the server usually cannot read it. The bookmarklet reads it from the user's browser (schema.org data, embedded app state, then the page's product cards). |

## Layout

```
app/(site)     pages with the site header: home, lists, wishlist, profile, friends, import, bookmarklet
app/(auth)     sign-in screens in serika-accounts' split layout: login, register, access, magic
app/clip       the bookmarklet popup
app/api        REST API (and api/public for widgets)
lib/           config, db, accounts, auth, guests, magic links, lists, friends, importers, email
scripts/       command-line import
```
