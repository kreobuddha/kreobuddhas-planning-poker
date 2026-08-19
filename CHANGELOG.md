# Changelog

Notable changes to Planning Poker. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — read for an
application rather than a library: the major number moves when the way people use the app changes,
not when an API does, because there is no public API here.

## [Unreleased]

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
- The rules suite grew from 8 cases to 19: unauthenticated access, isolation between sessions,
  deletions, `hasOnly` violations, and an empty participant name. One of the new cases documents
  a gap rather than a guarantee — someone who never joined a session can still cast a vote in it.

### Removed

- `docs/kb-audit.md`, a stale snapshot that described a former employer's codebase in a public
  repository, and the reference to a private knowledge base in `docs/code-rules.md`.
- `public/icons.svg`, referenced from nowhere, and the never-imported `RootDispatch` export.

### Added

- `LICENSE` (MIT).
- `@kreobuddha/ui` moved from `0.19.0` to `1.0.0`. The library's first stable major changes
  nothing this app can see: the components it uses have the same props, and every design
  token keeps its name and its value. What did change is the stylesheet, which lost a
  duplicated token block and halved in size.

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
