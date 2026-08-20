# Planning Poker

A real-time planning poker tool: create a session, ask a question, vote in hidden cards,
reveal together. See [README.md](README.md) for setup and product behavior.

## Communication

- Discuss requirements, questions, assumptions, plans, trade-offs, progress, review findings,
  and final results with Rustam in Russian by default.
- Keep code, identifiers, filenames, commands, logs, error messages, commit messages, pull
  requests, and public documentation in English.
- Do not translate error messages, API names, library names, or established technical terms when
  translation would make them less precise. Explain unfamiliar terms in Russian when useful.
- Do not switch the conversation to English merely because the codebase or source material is in
  English.
- If a request is ambiguous in a way that can materially change the result, restate the ambiguity
  in Russian and ask one focused question. Otherwise, state reasonable assumptions and proceed.
- For a complex task, briefly restate the intended outcome and important constraints in Russian
  before implementation.

## Private knowledge and public boundaries

- Private reference material kept outside this repository — notes, audits, knowledge bases in
  parent directories — is not a project source. It must not be copied, committed, pushed, quoted
  substantially, or linked from public documentation, and it is not named in public files either:
  naming a private document tells a reader it exists and who it came from.
- Such material may inform general engineering conventions, but public code and documentation must
  be self-contained and must never require access to it.
- Never copy proprietary source code, assets, credentials, internal URLs, production data, or
  employer-specific fixtures into this repository. Reimplement general patterns with original
  code, naming, design, and synthetic data.
- When discussing prior professional work, distinguish observed code, Git-verified contributions,
  Rustam's first-hand confirmation, and inference. Do not invent authorship, intent, or metrics.

## Stack & structure

- React + TypeScript + Vite
- `@kreobuddha/ui` 1.0.0 — the component library and design tokens; `data-kreo-theme` on `<html>`
  selects light or dark. It is set before the first paint by the inline script in `index.html`
  (stored choice, otherwise `prefers-color-scheme`) and rewritten by `ThemeToggle`; the storage
  key and the light/dark logic live in `src/lib/theme.ts` and are duplicated in that script on
  purpose, since a synchronous inline script cannot import a module. Exports available:
  `Accordion`, `Alert`, `Badge`,
  `Button`, `IconButton`, `Progress`, `Skeleton`, `Spinner`, `TextField`, `Textarea`,
  `Select`, `Checkbox`, `Radio`, `Switch`, `FieldGroup`, `Tabs`, `ToastProvider`/`useToast`,
  `Toggletip`, `Tooltip`, `Dialog`. Reach for one of these before hand-rolling markup.
- Firebase (Firestore + Anonymous Auth) for data and realtime sync — see
  `firebase/firestore.rules` for the security model
- Redux Toolkit + RTK Query for the endpoints layer (see "Endpoints layer" below) — deliberately
  added despite the no-abstractions rule further down; don't strip it back out
- `src/components/` — shared UI, one folder per component (AppHeader, ThemeToggle, VoteCards,
  ParticipantList, Results, DeckPicker, CopyLinkButton)
- `src/hooks/` — flat, single-file hooks (`useTheme`), per `docs/code-rules.md`
- `src/store/` — `configureStore` (`index.ts`), `rootReducer.ts`, the shared empty RTK Query API
  instance (`emptyApi.ts`), and the fake-backend layer: `firebaseBaseQuery.ts` +
  `firestoreStream.ts` (see "Endpoints layer" below)
- `src/auth/` — `userSlice` (uid/loading/error), `useCheckAuth` (anonymous sign-in bootstrap),
  `store/authApi.ts` (the `signInAnonymously` endpoint)
- `src/lib/` — Firebase client init, session code generator, remembered participant name,
  remembered theme (`theme.ts` — its storage key is duplicated by the inline script in
  `index.html`, which cannot import a module; change both together)
- `src/config.ts` — the card decks (`CARD_DECKS`, `DEFAULT_DECK`) and `deckKeyOf`, which falls
  back to the default rather than trusting a `deck` string that came out of Firestore; plus every
  constant the client shares with the rules: `UNSURE_CARD`, `NAME_MAX_LENGTH`,
  `QUESTION_MAX_LENGTH`, `SESSION_TTL_MS` and `SESSION_MAX_EXTENSION_MS`. **Rules can't import
  this file**, so anything here with a counterpart in `firebase/firestore.rules` has to be
  changed on both sides at once — the comments beside each constant say which
- `src/types.ts` — domain interfaces (`ISession`, `IParticipant`, `IRound`, `IVote`)
- `src/main/sections/` — Home (create/join), Room (voting + reveal), one folder per section;
  a section large enough to split keeps its own `components/` folder (Room does)
- `src/main/endpoints/` — endpoints shared across sections (currently `sessionsApi.ts`,
  looking a session up by code)

## Endpoints layer

Firebase/Firestore calls are never made directly from components — they're wrapped in RTK
Query endpoint files, one `endpoints/` folder per section (`src/main/sections/<Name>/endpoints/`)
plus `src/main/endpoints/` for cross-section ones and `src/auth/store/` for auth. Components
call the generated `useXQuery`/`useXMutation` hooks only.

Endpoints are declarative `query: () => ({ url, method, data })` descriptors, exactly like the
REST projects this codebase's conventions come from. `src/store/firebaseBaseQuery.ts` is the
fake backend that executes them against Firestore. The HTTP vocabulary is deliberate mimicry —
Firestore never speaks HTTP — and it maps as:

| Verb            | Firestore                      | Target                          |
| --------------- | ------------------------------ | ------------------------------- |
| `GET` (default) | `getDocs` / `getDoc`           | collection or document          |
| `POST`          | `addDoc`, resolves to `{ id }` | collection (server-assigned id) |
| `PUT`           | `setDoc`                       | document (full replace)         |
| `PATCH`         | `updateDoc`                    | document (partial)              |
| `DELETE`        | `deleteDoc`                    | document                        |
| `BATCH`         | `writeBatch` + `commit`        | several documents, atomically   |

Descriptor details: **doc vs collection is inferred from path arity** — odd segment count is a
collection (`sessions`, `sessions/x/rounds`), even is a document (`sessions/x`). `params` carries
`where`/`orderBy`/`limit`. A read is reduced by `snapshotData` and by nothing else — a document
becomes an object or `null`, a collection becomes an array — so the fetch and the stream cannot
reduce the same snapshot differently. `notFound` turns a read that found nothing into an error,
which is how `findSessionByCode` reports a bad code. A read that fails always reports the
failure — an empty room and an unreadable one must not look alike to the UI.

A session's join code IS its document id (`sessions/{CODE}`), so a room is reached with a `get`.
That's what lets the rules deny `list` on `/sessions` outright, and it makes a code collision a
rejected write instead of a second team silently landing in the first team's room.

Live data still needs `onCacheEntryAdded`, because `BaseQueryFn` resolves exactly once and has
no channel for later values. `streamFrom` in `src/store/firestoreStream.ts` bridges the two: an
endpoint names its descriptor builder once and passes it to _both_ `query` and `streamFrom`, so
the initial fetch and the `onSnapshot` stream run the same `resolveRef` + `snapshotData` and can't
drift apart. Subscribed endpoints therefore do one real read on mount (making `isLoading`
meaningful) and stay live after.

A subscribed endpoint also passes `streamFrom` its own
`api.util.upsertQueryData(name, arg, value)` — the second argument. `updateCachedData` is a
`produce` over existing data and a no-op on an entry that has none, so an entry whose initial
read failed can only be repaired by upserting the first snapshot that arrives. That is what
lets the room come back on its own after a lost connection instead of sitting on an error.

Two things to keep in mind when editing this layer:

- **Paths are strings, so a typo is a runtime error, not a compile error.** This is the accepted
  cost of the indirection — same as `url` in the REST projects. Test path changes in the browser.
- `src/auth/store/authApi.ts` stays on `queryFn`: `signInAnonymously` is Firebase _Auth_, not
  Firestore, so it can't route through this baseQuery. This mirrors the REST projects, where
  `authApi` is its own `createApi`.

No `providesTags`/`invalidatesTags` are used: subscriptions stay live via `onSnapshot`, so
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
- No UI tests and no error boundaries — a deliberate choice, not an oversight. Verification of
  application code leans on `npm run build`, `npm run lint`, and manual browser smoke testing
  instead. Don't add tests or error boundaries unasked; if that tradeoff ever needs revisiting,
  that's a decision for the user to make, not something to introduce quietly.
- **The Firestore rules are the one exception** (`tests/firestore-rules.test.ts`,
  `npm run test:rules`). They're the only server-side boundary here, and the browser can't
  verify them: a denied read arrives looking exactly like an empty one, so a hole stays
  invisible until someone exploits it. The suite runs against the emulator via
  `node --test` — no test framework, and it needs a JDK on PATH for the emulator. Extend it
  whenever a rule changes.

## Firebase conventions

- Collections/subcollections: `sessions/{id}`, `sessions/{id}/participants/{uid}`,
  `sessions/{id}/rounds/{id}`, `sessions/{id}/rounds/{id}/votes/{uid}`.
- A vote document's id is its voter's uid, so the `votes` list doubles as "who has voted" —
  that's what drives the `voted` / `waiting` status in `ParticipantList`, and deleting the
  document is what puts a participant back to `waiting`.
- **Hiding votes before the reveal is UI-level, not a security boundary.** Rules let any
  signed-in user read the whole `votes` collection, because Firestore allows or denies a
  collection list as a whole — it can't hand back a filtered subset, so "list who voted" and
  "hide what they voted" can't both come from rules without a second collection (there used
  to be a parallel `voteStatus` one; it was removed deliberately). A participant can read
  values from the network tab. Rules still enforce the parts that _are_ enforceable: you can
  only write your own vote, and only while the round is open, so a revealed result can't be
  rewritten.
- Security rules live in `firebase/firestore.rules`. Before deploying a rules change, check it
  against the read/write cases in the README's "How it works" section — especially that a vote
  can't be written or deleted once `revealed` is true. Note the one asymmetry: the admin may
  delete another participant's vote while the round is open, because removing somebody has to take
  their vote with them; nobody may ever change another person's vote, and neither may touch one
  after the reveal.

## AI workflow rules

- For multi-file, unfamiliar, or architectural changes, explore the relevant code and propose a
  concise plan before editing. Small, obvious changes may be implemented directly.
- Preserve existing user changes and avoid unrelated refactoring, dependency upgrades, formatting,
  or generated-file churn.
- Distinguish verified facts from assumptions. If an investigation is intentionally scoped, state
  what was and was not inspected.
- Define acceptance criteria and relevant verification before implementing a non-trivial change.
- Check whether a command mutates files before running it. In this project `npm run lint` is
  non-mutating, while `npm run format` rewrites files.
- Always run `npm run build` before calling a change done, not just `tsc --noEmit` (see above
  — this caught real errors last session that the type-check alone missed).
- Run `npm run lint` for code changes. This project intentionally has no automated test suite, so
  do not claim test coverage that does not exist or add a test framework without discussing the
  change with Rustam first.
- For any user-facing change, verify it in the browser preview, not just by reading the diff.
- Never hardcode or invent real Firebase credentials. If `.env` is missing, ask the user for
  their project's config rather than guessing or stubbing values.
- Do not weaken types, lint rules, Firebase security rules, or product constraints merely to make
  verification pass.
- Finish with the changed files, verification commands and results, remaining risks, and anything
  that could not be verified.
- Never push to GitHub without confirming with the user first, even though the repo has a
  remote configured — a prior approval doesn't carry forward to later pushes.
- Do not commit, open a pull request, deploy Firebase resources, or modify external services unless
  Rustam explicitly asks for that action.
- When compacting context, preserve modified files, accepted decisions, pending work, blockers,
  Firebase/security implications, and verification commands.

### Commit messages

Commit subjects follow Conventional Commits — `feat:`, `fix:`, `docs:`, `chore:`, `ci:`,
`refactor:`, with `!` before the colon for a breaking change. Scopes are not used. This was adopted
on 2026-08-19; the history before it is free-form imperative and is never rewritten, so the log is
mixed by design. The body still explains _why_ rather than _what_.

### The release commands are the one exception

`/release:start`, `/release:feature`, `/release:land`, `/release:status`, `/release:sync`,
`/release:finish` and `/release:ship` (in `~/.claude/commands/release/`) carry a standing, narrow
authorisation for the steps that come _before_ a pull request is merged. It applies only while one
of those commands is running, and only to the actions listed here:

- create a branch whose name matches `feat/`, `fix/`, `docs/`, `chore/`, `ci/`, `refactor/` or
  `release/`;
- commit to that branch;
- push that branch to `origin`;
- open a pull request;
- merge a pull request whose base is a `release/*` branch once its checks are green, and delete the
  branch it came from.

This replaces the per-push confirmation for those steps and for nothing else. The rules above keep
their full force everywhere else, and two of them matter more here than in a library:

- **Merging into `master` is Rustam's action, and here the merge _is_ the deployment.**
  `.github/workflows/deploy.yml` runs on every push to `master`: it rebuilds the site, publishes it
  to Firebase Hosting and deploys `firebase/firestore.rules` — the only server-side boundary this
  app has. A command prepares the release pull request, runs the gate, reports the review, and
  stops with the exact merge command written out.
- **The tag and the GitHub release are produced by `.github/workflows/release.yml` and by nothing
  else.** Never run `git tag` and never push a tag. That workflow has no branch guard of its own,
  so it is dispatched only with `--ref master`, only with the version named, and only after Rustam
  confirms that exact version.
- A change reaches a release branch through a feature branch and its pull request. The single
  release commit written by `/release:finish` is the only commit made directly on a release branch,
  and no commit is ever made directly on `master`.
- No force-push, no rebase of a pushed branch, no `reset --hard`, no history rewriting, no deleting
  a tag or a branch other than a feature branch whose pull request has just merged.
- Outside a `/release:*` command none of this is authorised. A command run earlier in the session
  does not authorise the same action later, and neither does a plan that mentions one.
- If `.claude/release.json` is missing, unreadable, or its `schema` is not one the command
  understands, the exception does not apply: stop and say so.
