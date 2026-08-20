# Changelog

Notable changes to Planning Poker. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — read for an
application rather than a library: the major number moves when the way people use the app changes,
not when an API does, because there is no public API here.

## [Unreleased]

### Added

- **A light theme, and a switch for it.** The interface was pinned to the dark palette by an
  attribute written into `index.html`, though the component library has carried a light one all
  along. The switch sits in a new application header beside the product name, on every screen —
  including the ones that come before a room loads. A first visit follows the operating system's
  preference; after that the remembered choice is what decides, and it is the only thing that
  overrides the system. The attribute is set by a small synchronous script before the first paint
  rather than from the app, because doing it in React would show one frame of the wrong theme to
  everyone who picked dark.

### Changed

- **The room's "← Home" link is gone.** The product name in the new header leads home from every
  screen, and two links to the same place in two stacked headers is noise. The home page likewise
  drops its own heading — the header already carries the name — and keeps a hidden one so the
  page still has a level-one heading to announce.

## [0.3.1] — 2026-08-19

### Fixed

- **A room could not be created at all in 0.3.0.** Creating one writes the session document and
  its admin's participant row as a single batch, so that a room can never exist with nobody able
  to join it. The deadline rules added in 0.3.0 gated participant writes on reading the session
  document — but rules evaluate each write in a batch independently and against the state before
  it, so the session document does not exist yet while the participant row is being checked. The
  row was refused, the batch rolled back, and every "Create session" ended in a permission error.
  Writes to a session that does not exist are now allowed through that one gate, which is what
  they were before deadlines existed.
- The rules suite had no case that wrote a batch, which is why 28 passing cases said nothing
  about the one path every room is created through. It now exercises the batch the app actually
  writes.

### Changed

- **The deploy publishes the rules before the site.** Either order leaves a moment where half a
  release is live, so the only question is which half. Rules first leaves the old app running
  against the new rules, which is what those rules were reviewed against anyway; site first
  leaves a new app asking a boundary that has not learned to allow it yet — which is precisely
  how 0.3.0 reached the demo with no way to create a room.

## [0.3.0] — 2026-08-19

### Added

- **Rooms have a lifetime.** A session now carries a deadline and stops accepting writes once it
  passes: an abandoned room can no longer be voted in a month later. The admin is warned before
  the deadline and can push it back while the room is live, always measured from the moment of
  extending — a room in use keeps earning time, a forgotten one runs out on schedule. The rules
  cap how far ahead a deadline may be set, never how close, so a development build can create
  five-minute rooms without a rule change.
- **"Close room".** The same state, reached deliberately: closing brings the deadline forward to
  now, behind a confirmation. Closing and expiring are deliberately one state rather than two, so
  neither the rules nor the room has to carry a second flag. What was asked and what was voted
  stays readable afterwards.
- **Handing the room over.** The admin can pass the role to anyone already in the room, which is
  the only way back from an admin who closed their laptop. The rules check that the new admin is
  a participant: handing the room to a uid that never joined would strand it exactly as losing
  the admin does.
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
- **The room keeps its history.** Previous questions sit beside the participants with the average
  they were estimated at, so a session is a record of the meeting rather than one live question.
  Only the latest round was ever read before.
- `LICENSE` (MIT).

### Changed

- **A room that cannot be read says so, and repairs itself.** A failed read used to degrade to an
  empty list, which the room could not tell apart from a room you had not joined — so a lost
  connection greeted you with a form inviting you to join a room you were already in. Reads now
  report their failure, the room shows "connection lost" while it lasts, and the live listener
  writes the first snapshot it receives back into the failed entry, so the room comes back on its
  own once the connection does.
- **The participant list is ordered by arrival** instead of by whatever order Firestore returned.
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
- The rules suite grew from 9 cases to 28: unauthenticated access, isolation between sessions,
  deletions, `hasOnly` violations, an empty participant name, everything the new round rules now
  refuse, and the whole of the session lifetime and the admin handover. One of the cases documents
  a gap rather than a guarantee — someone who never joined a session can still cast a vote in it.

### Removed

- `docs/kb-audit.md`, a stale internal document that had no business being in a public
  repository, and a reference to private material in `docs/code-rules.md`.
- `public/icons.svg`, referenced from nowhere, the never-imported `RootDispatch` export, and the
  unused `select: 'ids'` branch of the query layer.

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
