# Changelog

Notable changes to Planning Poker. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — read for an
application rather than a library: the major number moves when the way people use the app changes,
not when an API does, because there is no public API here.

## [Unreleased]

### Added

- **A "?" card.** Not every question can be sized, and until now the only way to say so was to
  not vote at all — which reads as "not here yet". "?" is a vote: it is cast, it clears, and it
  is left out of the average and the spread, with its author named in the results as not counted
  towards the estimate. It sits after the deck rather than inside it, so no deck gained a value.
- **The spread beside the average.** A room that voted 1 and 13 and a room that voted 7 twice
  averaged the same and read the same. The results now show the lowest and highest estimate
  alongside the average.
- **Who did not vote, after the reveal.** The revealed cards can only show the people who voted,
  so a silence looked like agreement. Everyone with no vote now gets a card of their own in the
  results and keeps a status badge in the participant list.
- **Reopening a round.** After a reveal the admin can put the same question back to the table:
  the cards come back, every vote already cast is still there, and anyone can change their mind.
  Previously a revealed round was final and the only way on was a new question.
- `LICENSE` (MIT).

### Changed

- **TypeScript runs in `strict` mode**, and the Firestore rules suite is type-checked with
  everything else. The application code needed no changes to pass — `strictNullChecks` and
  `noImplicitAny` found nothing to fix in `src/`, which is what the `?? null` and `?.` habits
  throughout were already buying. `tests/` had never been in any `tsconfig` at all, so
  `tsc -b` now covers it too.
- **Pull requests are checked before they land.** `lint`, `format:check` and `build` used to run
  only after a merge to `master` — which is the deployed state of the app. A new `ci.yml` runs
  them on every pull request, into `master` and into `release/**` alike, and adds the Firestore
  rules suite, which had never run in CI at all.
- **The Firestore rules deploy from CI** instead of by hand, so the file in the repository can no
  longer drift from what is actually enforced. `npm run test:rules` runs first as a gate, and the
  rules get their own service account rather than widening the one that publishes the site.
- **The round rules validate what they accept.** `create` was `if isAdmin()` and nothing more,
  which let an admin write a round of any shape or size; it now takes the question, the flag and
  the clock, requires a non-empty question of at most 200 characters, and insists a new round
  starts closed. `update` is confined to `revealed`, so the question cannot be rewritten once the
  answers are in — and that is also what makes reopening safe to allow.
- **`Room.tsx` is five components rather than one file**: the header, the participant sidebar,
  the join form, the ask-a-question form and the round panel. Nothing about the room changed on
  screen.
- **The vote cards say what they are.** They were bare `<button>`s: no `type`, no group, no
  indication of which one you had chosen beyond its colour. They are now a labelled `role="group"`
  of toggle buttons carrying `aria-pressed` — toggles rather than radios, because pressing the
  card you already hold clears your vote, and a radio cannot be un-chosen.
- Name and question fields carry the length limits the security rules enforce, so hitting one is
  a field that stops accepting text rather than a permission error. Reveal, reopen, ask and deck
  changes show their in-flight state. A reveal or a reopen is announced to a screen reader — it
  is the one thing in the room that changes without the reader doing anything. Layout heights use
  `dvh`, so mobile browser chrome no longer makes the page taller than the screen.
- `@kreobuddha/ui` moved from `0.19.0` to `1.0.0`. The library's first stable major changes
  nothing this app can see: the components it uses have the same props, and every design token
  keeps its name and its value. What did change is the stylesheet, which lost a duplicated token
  block and halved in size.
- The rules suite grew from 8 cases to 21: unauthenticated access, isolation between sessions,
  deletions, `hasOnly` violations, an empty participant name, and everything the new round rules
  now refuse. One of the new cases documents a gap rather than a guarantee — someone who never
  joined a session can still cast a vote in it.

### Removed

- `docs/kb-audit.md`, a stale snapshot that described a former employer's codebase in a public
  repository, and the reference to a private knowledge base in `docs/code-rules.md`.
- `public/icons.svg`, referenced from nowhere, and the never-imported `RootDispatch` export.

## [0.2.0] — 2026-08-18

The interface is now built out of [`@kreobuddha/ui`](https://github.com/kreobuddha/kreobuddha-ui)
instead of hand-rolled markup, and the library moved from `0.3.0` to `0.19.0` along the way.

### Changed

- **Home, Room and the deck picker are built from the library's components.** Text inputs are
  `TextField`, errors are `Alert`, the vote-status pill is `Badge`, the loading state is `Spinner`,
  and the deck picker is a `FieldGroup` of `Radio`s rather than a row of buttons — so the deck
  choice now behaves like the radio group it always was, keyboard included.
- **"Copy room link" reports through a toast** from the library's `ToastProvider`, replacing the
  component's own transient message.
- Local styling shrank accordingly: colour, type and shape come from the library's token layer, and
  roughly 80 lines of component SCSS went away with the markup they described.

## [0.1.0] — 2026-08-17

The first tagged version. Everything below already worked; what is new is that there is now a
version number to point at, and a deployed site to point people at.

### Added

- **A public demo**, deployed to Firebase Hosting from `master` by `.github/workflows/deploy.yml`.
  It runs against its own Firebase project, so demo traffic never lands in the database used for
  development.
- **Tagged releases.** `.github/workflows/release.yml` is started by hand with the version it is
  cutting, checks that `package.json` agrees, reads the notes out of this file, then tags the
  commit and publishes the GitHub release. Nothing is sent to a registry: this app is not a
  package.
- `format:check`, the read-only half of `format`. The repository was reformatted once so that it
  passes, and both workflows now run it, so formatting cannot drift again.

### The app as it stands at `0.1.0`

- create a session, share the code or the room link, and estimate together in person-days;
- three card decks, chosen by the admin and changeable between rounds;
- votes stay hidden until the admin reveals them, then everyone sees the cards and the average;
- picking the card you already hold clears your vote;
- realtime through Firestore listeners, with anonymous authentication;
- Firestore security rules, with their own test suite against the emulator;
- the interface built on [`@kreobuddha/ui`](https://github.com/kreobuddha/kreobuddha-ui).
