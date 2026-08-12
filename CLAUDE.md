# Planning Poker

A real-time planning poker tool: create a session, ask a question, vote in hidden cards,
reveal together. See [README.md](README.md) for setup and product behavior.

## Stack & structure

- React + TypeScript + Vite
- Firebase (Firestore + Anonymous Auth) for data and realtime sync — see
  `firebase/firestore.rules` for the security model
- Redux Toolkit + RTK Query for the endpoints layer (see "Endpoints layer" below) — deliberately
  added despite the no-abstractions rule further down; don't strip it back out
- `src/components/` — shared UI, one folder per component (VoteCards, ParticipantList, Results)
- `src/store/` — `configureStore` (`index.ts`), `rootReducer.ts`, and the shared empty RTK Query
  API instance (`emptyApi.ts`, `fakeBaseQuery()` — see below)
- `src/auth/` — `userSlice` (uid/loading/error), `useCheckAuth` (anonymous sign-in bootstrap),
  `store/authApi.ts` (the `signInAnonymously` endpoint)
- `src/lib/` — Firebase client init, session code generator
- `src/config.ts` — app-wide constants (e.g. `CARD_VALUES`)
- `src/types.ts` — domain interfaces (`ISession`, `IParticipant`, `IRound`, `IVote`)
- `src/main/sections/` — Home (create/join), Room (voting + reveal), one folder per section
- `src/main/endpoints/` — endpoints shared across sections (currently `sessionsApi.ts`,
  looking a session up by code)

## Endpoints layer

Firebase/Firestore calls are never made directly from components — they're wrapped in RTK
Query endpoint files, one `endpoints/` folder per section (`src/main/sections/<Name>/endpoints/`)
plus `src/main/endpoints/` for cross-section ones and `src/auth/store/` for auth. Components
call the generated `useXQuery`/`useXMutation` hooks only.

Firestore has no generic request shape the way REST does (paths, live listeners, and one-shot
reads/writes are all different), so there's no `axiosBaseQuery`-style translator — the shared
`emptyApi` uses `fakeBaseQuery()` and each endpoint defines its own `queryFn` calling the
Firebase SDK directly. Live data (participants, latest round, votes, vote status) uses
`builder.query` + `onCacheEntryAdded` to open an `onSnapshot` listener and push updates into the
RTK Query cache via `updateCachedData`, unsubscribing on `cacheEntryRemoved` — this is RTK
Query's documented pattern for streaming/subscription data, not a custom one. One-shot writes
(`createSession`, `castVote`, `revealVotes`, …) are plain `queryFn` mutations. No
`providesTags`/`invalidatesTags` are used: subscriptions stay live via `onSnapshot`, so
cache-tag invalidation would be redundant.

## Conventions

See [docs/code-rules.md](docs/code-rules.md) for the full personal style rules (arrow
functions, one folder per component/page with a colocated `.scss` file, `@/` import alias
instead of relative paths). Beyond those:

- `import type { X } from '...'` for type-only imports — `verbatimModuleSyntax` is on in
  `tsconfig`, so a plain `import { X }` for a type builds fine under `tsc --noEmit` but fails
  the actual `vite build`. Always use `npm run build`, not just `tsc --noEmit`, to catch this.
- No comments unless they explain a non-obvious "why" (a workaround, a hidden constraint).
  Well-named identifiers should carry the "what".
- Don't add abstractions, config flags, or error handling for cases that can't happen here —
  this is a small portfolio app, not a multi-tenant product. The RTK Query endpoints layer
  above is the one deliberate exception: it exists to match the user's personal
  auth-endpoints/action-endpoints convention used across their other projects, not because this
  app needs it. Keep it; don't "simplify" it back to direct Firebase calls without asking.
- No test suite and no error boundaries — a deliberate choice, not an oversight. Verification
  leans on `npm run build`, `npm run lint`, and manual browser smoke testing instead. Don't add
  tests or error boundaries unasked; if that tradeoff ever needs revisiting, that's a decision
  for the user to make, not something to introduce quietly.

## Firebase conventions

- Collections/subcollections: `sessions/{id}`, `sessions/{id}/participants/{uid}`,
  `sessions/{id}/rounds/{id}`, `sessions/{id}/rounds/{id}/votes/{uid}`,
  `sessions/{id}/rounds/{id}/voteStatus/{uid}`.
- `votes` holds the actual value and is read-restricted (own vote, or any vote once the round
  is `revealed`). `voteStatus` is a parallel, openly-readable doc written alongside each vote
  so the UI can show "who's voted" without exposing values early — Firestore has no
  server-side function to do this in one place the way the old Postgres RPC did, so it's two
  writes per vote instead of one.
- Security rules live in `firebase/firestore.rules`. Before deploying a rules change, check it
  against the read/write cases in the README's "How it works" section — especially that a vote
  value is genuinely unreadable pre-reveal, not just hidden in the UI.

## AI workflow rules

- Always run `npm run build` before calling a change done, not just `tsc --noEmit` (see above
  — this caught real errors last session that the type-check alone missed).
- For any user-facing change, verify it in the browser preview, not just by reading the diff.
- Never hardcode or invent real Firebase credentials. If `.env` is missing, ask the user for
  their project's config rather than guessing or stubbing values.
- Never push to GitHub without confirming with the user first, even though the repo has a
  remote configured — a prior approval doesn't carry forward to later pushes.
