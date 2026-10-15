# Samvaad AI — Press Note Assistant

Samvaad AI helps government officers turn messy case material — FIR PDFs,
photos, voice briefings — into clean, formal press notes in English and Hindi.
A human officer always checks and approves before anything is published. The
software never declares anyone guilty and never invents numbers.

Built for the IEEE-IGNITE hackathon, problem SKIT005:
*AI-Based Press Note Generation and Official Communication Assistant.*

## The problem, in plain words

After a police action, the press note is typed by hand. The clerk re-reads the
FIR, re-listens to voice notes, and retypes names, dates, and amounts. This is
slow and mistakes happen: a wrong amount, a missing "alleged", a casualty
number nobody confirmed. In the worst case a draft states guilt before trial,
which is unlawful.

## What the software does

You upload whatever you have — a form, a PDF, a photo, an audio briefing, or
all of them. The software reads everything, pulls out the facts, checks each
fact against its source, writes three headline options plus a short summary
plus a full note (English + Hindi), and puts it in front of an officer. The
officer edits, approves, and only then is it final. Every version and every
source is kept, so any sentence can be traced back to the page or audio
second it came from.

Small example. A station uploads two things: an FIR PDF saying
"Crime No. 12, online fraud, two arrests made", and a 2-minute Hinglish voice
note saying "teen log ghayal" (three injured) while another line in the same
note says "do ghayal" (two injured). The software:
1. Reads the PDF with OCR and transcribes the audio.
2. Accepts Crime No. 12 and the two arrests (each has a source).
3. Refuses to pick between "two" and "three" injured — it marks the field
   *conflicting* and keeps both options for the officer.
4. Writes the draft with the sentence "The number of injured persons could not
   be confirmed from the available sources."
5. Flags the word "scamster" if anyone typed it, and forces "accused" instead.

## How the pipeline works, step by step

```
Upload → Check files → Read (OCR / speech-to-text) → Structure facts
→ Verify with Laya → Neutrality check → Write draft bundle
→ Officer edits + approves → Publish + audit trail
```

1. **Upload.** The browser sends only file details (name, size, type) to the
   server. The server answers with a short-lived upload ticket, and the
   browser puts the file straight into Cloudflare R2 storage. Big files never
   travel through the web server, so uploads don't crash it.
2. **Check files.** Every file is scanned: real type vs claimed type, size
   limits, audio length limits. Bad files go to quarantine, never into drafts.
3. **Read.** PDFs and photos go through Mistral OCR (text + boxes + confidence).
   Audio goes to Sarvam (Hindi/Hinglish) or OpenAI transcription (English).
   Low-confidence pages are marked and excluded from automatic citations.
4. **Structure facts.** Claims are sorted per field: cited value → confirmed;
   no source → `not_stated`; value without source → `unverified`; two sources
   disagree → `conflicting` with both kept. Money, casualties, and crime
   fields default to `not_stated` — the system would rather say "not stated"
   than guess.
5. **Verify with Laya.** Every extracted fact is asked back as a yes/no
   question against its source text ("Is the amount stated in the text?").
   High doubt → human review.
6. **Neutrality check.** A word scan blocks guilt language ("guilty",
   "kingpin", "confessed"), sensational words, and invented scale ("crores
   siphoned" without a source).
7. **Write draft bundle.** Fixed shape, always: 3 headlines (max 15 words),
   an ~80-word summary, a ~400-word detail note — each in English and Hindi.
   Every sentence traces to sources. Missing facts render as "could not be
   confirmed", never as filler.
8. **Officer edits + approves.** The editor shows sources, citations, and all
   warning flags side by side. Each edit makes a new version. Approval needs
   an explicit sign-off checkbox for crime/casualty claims. No approval token
   means no publish — waiting too long escalates, it never auto-publishes.
9. **Publish + audit trail.** The final note plus all versions, sources,
   model names, confidences, and the approver's identity are stored together.
   Anyone can later answer "who approved this sentence, from which source?"

## Tech stack

| Part | Choice | Why |
|---|---|---|
| Web app | Next.js 16 (App Router) + React 19 | Full-stack app, server + UI in one place |
| API | tRPC v11 | Type-safe API: the UI can't call it wrong |
| UI | shadcn/ui + Tailwind | Ready-made, clean components |
| Login | Neon Managed Better Auth | Users and sessions live in our own database |
| Database | Neon Postgres + Drizzle ORM | Source of truth; dev uses `db:push`, prod uses migrations |
| Files | Cloudflare R2 | Cheap S3-style storage, direct browser uploads |
| Search later | Qdrant | Finds similar past notes (add-on, not the core) |
| Heavy AI jobs | Trigger.dev | Long OCR/transcription jobs that survive crashes |
| Events | Inngest | Small event reactions (upload arrived → start job) |
| Memory later | mem0 | Remembers style/entities — only learns from approved notes |
| Watching quality | Langfuse + Sentry | LLM traces + crash reports |

## Which model does which task

| Task | Model | Key status |
|---|---|---|
| Read PDFs/photos (OCR) | Mistral OCR | ✅ key verified |
| English speech-to-text | OpenAI transcription via Corsair gateway (`gpt-5.4-mini` default) | ✅ key verified, test call passed |
| Hindi/Hinglish speech-to-text | Sarvam `saaras:v4` | ✅ stored, proven on first real run |
| Fact checking (yes/no judge) | Laya Studio (`/v1/systemone`) | ✅ key verified, 6000 free credits |
| Draft wording | Template engine v1 (deterministic) | ✅ built-in; LLM fluency upgrade later |
| Memory | mem0 | ⏳ key rejected twice by mem0 — needs dashboard re-check |

No single model is trusted alone: OCR gives geometry + confidence, the fact
checker judges grounding, the neutrality scan guards language, and the human
approves. A model may suggest; only the officer decides.

## Project layout

```
src/lib/result        tiny success/failure helper
src/lib/env           typed settings loader
src/lib/r2            file-storage seam (presigned uploads, checks)
src/lib/db            database tables + connections (schema.ts)
src/lib/press-facts   facts + neutrality + draft bundle
src/lib/verify        Laya fact-checker port
src/lib/auth          login wiring (Managed Better Auth)
src/lib/trpc          API client factories
src/server            tRPC routers, documents store, session, context
src/inngest           event client + functions
src/app               pages + API routes (/api/auth, /api/trpc, /api/inngest)
src/app/editor        approval UI (next UI feat)
specs/                one spec file per feature (001–007)
drizzle/              database migration files (prod only)
ARCH.md               full architecture (this folder)
MEMORY.md             permanent project memory (rules + status)
```

## Run it locally

```bash
npm install
# fill .env.local (see .env.local keys below — never commit this file)
npm run dev
```

Useful commands: `npm run test` (all tests) · `npm run typecheck` ·
`npm run lint` · `npm run build` · `npm run db:push` (dev database only —
migrations are prod-only).

Needed in `.env.local`: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk dev keys via
`npx clerk env pull`; production via `env pull --instance prod` after `deploy`),
R2 keys (`CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_S3_ENDPOINT`), `MISTRAL_API_KEY`, `LITELLM_API_KEY` (+ `LITELLM_BASE_URL`,
`LITELLM_MODEL`), `SARVAM_API_KEY`, `LAYA_API_KEY`, `INNGEST_DEV=1`.

## Project status (honest)

Built and proven: file uploads to R2 (live), database module (live
round-trip on a scratch branch, production untouched), fact engine +
neutrality + draft bundle (30+ tests), login wiring + tRPC API (live HTTP:
health 200, signed-out calls get 401), Inngest dev loop (live), all AI keys
verified except Sarvam (first real run) and mem0 (rejected — needs dashboard
re-check). Still ahead: memberships + tenant enforcement, approval UI,
Trigger.dev project setup (needs one human login click), LLM claim extractor,
Qdrant search.

## Rules we build by

Specs before code · small modules with small interfaces · dependencies
injected, never hidden · no `any`, no `ts-ignore` (machine-checked) · no
non-English words in code (Hindi arrives as runtime data) · no hardcoded
operator settings (sizes, limits, word lists are options) · test first, then
commit, then push · never present unverified things as verified.
