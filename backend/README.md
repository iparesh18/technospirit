# TechnoSpirit — Backend

Express 5 + MongoDB (Mongoose 9) API for contact inquiries, transactional mail
and the admin dashboard.

```
backend/
├── config/
│   ├── env.js          one place that reads process.env, validated at boot
│   └── db.js           mongoose connection + lifecycle logging
├── controllers/
│   ├── contactController.js      POST /api/contact
│   ├── authController.js         login / me / logout
│   └── adminInquiryController.js list / detail / status / stats
├── middleware/
│   ├── requireAuth.js  the real access gate on /api/admin/*
│   ├── rateLimiters.js login, contact and admin-API limits
│   ├── validate.js     express-validator → one 400 with a field map
│   └── errorHandler.js the single exit for every failure
├── models/
│   ├── Inquiry.js      name, email, purpose, message, status, mail, meta
│   └── Admin.js        email + bcrypt hash (select:false)
├── routes/             contact / auth / admin, mounted under /api
├── services/
│   ├── mailer.js       nodemailer transport; never rejects
│   └── emailTemplates.js  the two HTML emails
├── utils/
│   ├── AppError.js     errors the API is willing to describe
│   ├── sanitize.js     cleanText / cleanLine / escapeHtml / escapeRegex
│   ├── token.js        JWT sign/verify + the HttpOnly cookie
│   ├── bootstrapAdmin.js  first-boot admin creation (idempotent)
│   └── seedDev.js      sample inquiries for dashboard work
├── app.js              express wiring (helmet, cors, json, cookies, routes)
└── server.js           boot order: env → db → admin → mail check → listen
```

## Running

```bash
cp .env.example .env      # then fill it in
npm install
npm run dev               # http://127.0.0.1:5000
```

The frontend proxies `/api` to this server (see `frontend/vite.config.js`), so
in the browser everything is same-origin. That is what lets the auth cookie be
`SameSite=Lax` rather than `None`.

```bash
npm run seed              # 12 sample inquiries (no email is sent)
npm run seed:reset        # delete every inquiry, then re-seed
```

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/contact` | — | create an inquiry, send both emails |
| `GET` | `/api/health` | — | readiness + inquiry count |
| `POST` | `/api/auth/login` | — | sets the HttpOnly cookie |
| `GET` | `/api/auth/me` | ✔ | who am I (how React knows it is signed in) |
| `POST` | `/api/auth/logout` | — | clears the cookie |
| `GET` | `/api/admin/stats` | ✔ | overview counts, all from Mongo |
| `GET` | `/api/admin/inquiries` | ✔ | `?page&limit&status&search` |
| `GET` | `/api/admin/inquiries/:id` | ✔ | full record |
| `PATCH` | `/api/admin/inquiries/:id/status` | ✔ | `{ status }` |
| `POST` | `/api/chat` | — | ask the assistant; `{ message, history? }` |

`GET /api/admin/inquiries` is capped at `limit=50` and returns a 180-character
message preview rather than the full body, so the response is bounded no matter
how large the collection gets.

## Authentication

- Password is bcrypt-hashed at cost 12. **Plaintext is never stored.**
- `passwordHash` is `select: false`, so ordinary queries cannot return it.
- The JWT lives in an **HttpOnly** cookie (`ts_admin_token`), `SameSite=Lax`,
  `secure` in production, 7-day expiry. JavaScript can never read it.
- `requireAuth` re-reads the admin from Mongo on every request, so deleting an
  admin revokes their session immediately rather than at token expiry.
- Login answers with one message for both "no such admin" and "wrong password",
  and runs bcrypt against a dummy hash when no admin matched so the two paths
  take the same time.

### Resetting the admin password

`bootstrapAdmin` is idempotent — it will not overwrite an existing admin, so
editing `ADMIN_INITIAL_PASSWORD` in `.env` does nothing on its own. To reset:

```bash
mongosh technospirit --eval 'db.admins.deleteMany({})'
# set the new ADMIN_INITIAL_PASSWORD in .env, then restart
npm run dev
```

## Mail

One Gmail account is both the SMTP sender and the internal receiver.
`EMAIL_APP_PASSWORD` must be a Google **App Password** (16 characters, requires
2FA), not the account password.

Two messages go out per inquiry:

1. **Customer confirmation** — subject `We received your message — TechnoSpirit`
2. **Internal notification** — subject `New Inquiry — {name} — {purpose}`,
   with `replyTo` set to the visitor, so pressing Reply in Gmail addresses the
   customer rather than the TechnoSpirit account that sent it.

Both are table-based, fully inlined, email-safe HTML in the brand's palette.
Archivo is deliberately not loaded — a webfont fails in most clients.

**Mail never gates an inquiry.** The write happens first, the visitor is
answered second, and mail is dispatched third; the outcome is recorded on the
document as `mail.customer` / `mail.internal` (`pending|sent|failed|skipped`).
A delivery failure is logged for operators and never shown to the visitor, and
it can never cause a duplicate inquiry — which is exactly what would happen if
delivery were awaited before responding and a client retried.

With `EMAIL_USER` / `EMAIL_APP_PASSWORD` blank the API still accepts and stores
inquiries; it logs a warning and marks both as `skipped`.

## The assistant

`POST /api/chat` answers questions about TechnoSpirit from a fixed knowledge
base. Set `AI_PROVIDER`, a key and a model in `.env` (see `.env.example`).
With no key the endpoint answers 503 with the contact fallback and the rest of
the site is unaffected — that is a supported state, not a broken one.

Providers: **groq** (default, official `groq-sdk`) and **openrouter**. The
default model is `openai/gpt-oss-20b` — chosen after checking Groq's list, not
assumed: the `llama-3.x` models were deprecated on 17 June 2026 and gpt-oss is
Groq's own migration target. `openai/gpt-oss-120b` is the swap if grounding
needs more weight; change `GROQ_MODEL` and restart, nothing else.

```
services/ai/         one file per vendor. groq.js and openrouter.js are the
                     ONLY files that import an SDK or know a vendor's shape.
services/chat/       provider-agnostic: the system prompt, the knowledge base,
                     history trimming, the length ceiling and the grounding
                     rules. Written once, shared by every provider.
knowledge/           technospirit.json — verified facts, scanned from the site.
```

Switching provider is `AI_PROVIDER=openrouter` plus a key; no prompt, route,
knowledge or UI change. Contact details are injected from env at request time
and are deliberately **not** in `technospirit.json`, which is committed.

The knowledge file is the assistant's only source of fact. Anything not in it —
pricing, timelines, clients, team size, location — it must refuse and hand over
the contact number. When adding to it, add facts that exist on the site; if a
claim is not on the site, it does not belong in the file.

Guardrails that do not depend on the prompt: 1000-character input cap, 6 turns
of history (rebuilt server-side, never trusted from the browser), a 12s timeout
per attempt, a 300-token output ceiling, a 900-character response cap, and
15 messages per 5 minutes per IP.

Retry is exactly one attempt, and only for failures where a second try is a
different roll of the dice — 408/409/429/5xx and network-level errors. A bad
key, a bad model name or a malformed request fail identically every time, so
retrying those would only double the latency and the quota spent reaching the
same error. Timeouts are never retried: the visitor has already waited.

`AI_FALLBACK_ENABLED` (default `false`) is the switch for automatic failover to
the other provider. Off by design — silently spending a second vendor's credits
is not a decision this code makes on an operator's behalf.

## Security

| Concern | Handling |
|---|---|
| Password storage | bcrypt cost 12, `select: false` |
| Session token | HttpOnly + SameSite=Lax + `secure` in prod |
| Protected data | `requireAuth` on the whole `/api/admin` router |
| Brute force | 8 login attempts / 15 min (successes not counted) |
| Contact spam | 5 / 10 min, honeypot field, server-side validation |
| Input | sanitised on the way in, escaped on the way into email HTML |
| Regex injection | search terms are `escapeRegex`'d before `$regex` |
| CORS | explicit allowlist + `credentials: true` (no wildcard possible) |
| Headers | helmet (CSP off — this process serves JSON, not HTML) |
| Body size | 32kb cap → clean 413, not a 500 |
| Error output | only `AppError` messages reach the client; everything else is one generic sentence, stack traces in dev only |

Frontend validation is a convenience for the visitor. The schema and the
express-validator rules are the actual gate, and both run on every request.

### Adding CAPTCHA later

The honeypot and the rate limiter are independent of each other, so a
Turnstile/reCAPTCHA check can be added as one more middleware in front of
`createInquiry` in `routes/contactRoutes.js` without touching anything else.
