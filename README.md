# Planning Poker

A real-time planning poker tool for team estimation. Create a session, share the code or the
room link, and vote on how long a task will take — in person-days — together.

- An admin creates a session, picks a card deck, and asks a question ("How long will X take?").
- Teammates join with a code and pick a card; picking the same card again clears the vote.
- Votes stay hidden until the admin reveals them, then everyone sees all cards and the average.

**Try it:** <https://kreobuddha-planning-poker-demo.web.app> — a public demo on its own Firebase
project. Anyone can open a room there; nothing in it is private.

## Stack

- React + TypeScript + Vite
- [`@kreobuddha/ui`](https://github.com/kreobuddha/kreobuddha-ui) 1.0.0 — the component
  library and design tokens the interface is built from
- [Firebase](https://firebase.google.com) — Firestore, Realtime listeners, anonymous auth
- react-router-dom

## Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. In **Build → Authentication → Sign-in method**, enable the **Anonymous** provider.
3. In **Build → Firestore Database**, create a database (start in production mode — the
   security rules below lock it down).
4. Deploy the security rules in [`firebase/firestore.rules`](firebase/firestore.rules), either
   by pasting them into the Firestore **Rules** tab in the console, or with the Firebase CLI:

   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

5. In **Project settings → General**, add a web app and copy its config. Copy `.env.example`
   to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

6. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

## Testing the security rules

The rules are the only server-side boundary in this app, and they can't be checked from the
browser — a denied read looks the same as an empty one. They have their own suite, run against
the Firestore emulator:

```bash
npm run test:rules
```

The emulator needs a JDK on your PATH (`brew install openjdk`). Nothing else is tested; see
CLAUDE.md for why.

## Continuous integration

Every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): `lint`,
`format:check`, `build`, and the rules suite above, with a JDK and the Firestore emulator on the
runner. It watches pull requests into `master` **and** into `release/**`, because work on a
release is merged into its release branch first and only the finished release reaches `master` —
a run limited to `master` would check nothing until it was too late to matter.

"Every" includes the pull request that closes a release, even though `ci.yml` does not exist on
`master` yet: for `pull_request` events GitHub takes the workflow from the merge ref rather than
from the base branch, so the file on the release branch is what runs.

`deploy.yml` runs the same rules suite before it publishes anything, as a gate rather than a
formality: it deploys those very rules to the live demo a step later.

The rules go out **before** the site. Either order leaves a moment where half a release is live,
so the choice is which half: rules first leaves the old app running against the new rules — which
is what those rules were reviewed against anyway — while site first leaves a new app asking a
boundary that has not learned to allow it yet.

## The public demo

The demo at <https://kreobuddha-planning-poker-demo.web.app> is deployed to
[Firebase Hosting](https://firebase.google.com/docs/hosting) by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `master`.

It runs against **its own Firebase project**, separate from the one used for development, because
the page is open to anyone and every visitor writes real documents. Setting it up is console work,
done once:

1. Create a second Firebase project, and repeat the **Setup** steps above in it — anonymous
   provider, Firestore database, and the rules from `firebase/firestore.rules`. Leave it on the
   free plan: without billing, abuse runs into a quota instead of into a bill.
2. In **Project settings → Service accounts**, create a key for an account holding the **Firebase
   Hosting Admin** role, and add the JSON as the repository secret `FIREBASE_SERVICE_ACCOUNT`.
   That role is deliberately narrow: the deploy publishes the site and cannot reach Firestore or
   its rules.
3. Create a _second_ service account holding **Firebase Rules Admin** and nothing else, and add
   its key as the repository secret `FIREBASE_RULES_SERVICE_ACCOUNT`. This is the one that
   deploys `firebase/firestore.rules`. Two accounts rather than one wider one, on purpose: the
   key that can rewrite the app's only security boundary should not also be the key that
   publishes the site, and neither should be able to do the other's job if it leaks.
4. In **Settings → Secrets and variables → Actions → Variables**, add the demo project's web
   config as six repository variables: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
5. In **Authentication → Settings → Authorized domains**, confirm `<project>.web.app` is listed.
   Firebase authorizes its own hosting domains, so there is normally nothing to add here; a custom
   domain would have to be added by hand, and without it anonymous sign-in is refused and the app
   never gets past "Loading…".

**Variables, not secrets, and deliberately.** Every one of those six values is compiled into the
JavaScript the workflow publishes, so anyone can read them out of the deployed bundle. A Firebase
web config identifies a project; it does not authorise anything. What protects the data is
`firebase/firestore.rules` and the authorized-domain list above. The service-account keys in steps 2
and 3 are the real secrets here, and neither enters the bundle.

Nothing else is needed to make a room link work: the `"source": "**"` rewrite in
[`firebase.json`](firebase.json) hands every path to `index.html`, so `/room/JA7GLS` reaches the
router with a 200 rather than a 404, and the app is served from a domain root — no build-time base
path, and no `basename` on the router.

## Releases

Versions are tagged from CI, never by hand:

1. Add a section to [`CHANGELOG.md`](CHANGELOG.md) under the version being cut, and set the same
   version in `package.json` **and** `package-lock.json` — update the lock with
   `npm install --package-lock-only` rather than editing it by hand. A lock left behind is the
   easiest way to ship a release whose recorded version disagrees with itself.
2. Merge that to `master`.
3. **Actions → Release → Run workflow**, entering the version.

The run refuses to tag if the manifest disagrees with what was typed or if the changelog has no
section for it, then tags the commit and publishes the GitHub release with those notes. Nothing is
sent to a package registry — this app is not a package.

## Optional: Claude Code preview config

`.claude/` is gitignored except for `release.json`, which is checked in because the release
workflow reads it. To let Claude Code start and drive the dev server itself, create
`.claude/launch.json` locally — it stays out of the repository:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "planning-poker",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 5173
    }
  ]
}
```

## How it works

- Each visitor is signed in anonymously via Firebase Auth, so no signup is required to
  create or join a session.
- Sessions are looked up by a short join code; the creator becomes the session admin.
- Votes are hidden from other participants until the admin reveals the round. **This is a UI
  guarantee, not a security boundary** — a participant who opens the network tab can read the
  values early. Firestore allows or denies a collection list as a whole and can't return a
  filtered subset, so showing _who_ has voted and hiding _what_ they voted can't both come from
  the rules; showing progress won.
- What the rules ([`firebase/firestore.rules`](firebase/firestore.rules)) do enforce: you can
  only write your own vote, and only while the round is open — so a revealed result can't be
  rewritten while it stands. The admin may _delete_ somebody else's vote, and only theirs to
  delete rather than to change: removing a participant takes their vote with them, or the revealed
  cards would name a person the room no longer has. That reach stops at the same place every other
  write does, `roundIsOpen()`, which is why removing somebody is offered only while the round is
  open. A reveal is not final, though: the admin can reopen a round, which puts the cards back on
  the table with every vote already cast still in place.
- Picking the card you already selected clears your vote and puts you back to _waiting_. "?" is a
  vote like any other in that respect — it is cast and cleared the same way — but it is left out
  of the average and the spread, and its author is named in the results as not counted.
- A room has a deadline. Writes stop once it passes; the rules still allow reads, but the app
  no longer shows a room it cannot write to — everyone in it is taken back to the home page and
  told the room has closed. The admin is warned beforehand and can push the deadline back while
  the room is live, never further ahead than the ceiling the rules enforce. "Close room" is the
  same state reached deliberately — it brings the deadline forward to now — so closed and
  expired are one state rather than two, and neither can be undone.
- Anyone can leave a room, and the admin can show somebody out; either way the person's vote in
  the open round goes with them, so the revealed cards never name somebody the room no longer
  has. Removing is offered only while the round is open, because a revealed result must not be
  rewritten. An admin who still has somebody to hand the room to has to hand it over before
  leaving: the rules only accept a new admin who is already a participant, so an admin who left
  first would strand the room.
- A room shows who is actually in it. Each tab reports itself while it is visible and stops when
  it is not, so somebody who closed their laptop is marked _away_ rather than counted among the
  people the room is still waiting for.
- The admin can hand the role to anyone already in the room. The rules check that the new admin
  is a participant, because handing the room to a uid that never joined would strand it exactly
  as losing the admin does.
- Your name can be changed from inside the room, not only on the way in — the room shows the new
  one to everybody at once, and remembers it for the next room you open.
- The interface comes in light and dark. A first visit follows the operating system's preference;
  after that the choice you made in the header is what decides, and it is remembered. The theme is
  set before the first paint by a small script in `index.html` rather than by the app, so nobody
  sees a frame of the wrong one — which is why the storage key is deliberately written twice,
  there and in `src/lib/theme.ts`, with a comment on both sides.
- Past rounds stay beside the room with the average they were estimated at, so a session reads as
  a record of the meeting rather than one live question.
- All state (participants joining, votes being cast, reveals) syncs live via Firestore
  `onSnapshot` listeners on the `participants`, `rounds`, and `votes` collections.

## Project structure

```
src/
  auth/         userSlice (uid/loading/error), useCheckAuth, store/authApi
  components/   AppHeader, ThemeToggle, VoteCards, ParticipantList, Results, DeckPicker,
                CopyLinkButton
  hooks/        useTheme (light/dark, remembered)
  lib/          Firebase client, session code generator, Timestamp conversion, theme storage
  main/
    endpoints/  sessionsApi (cross-section: look a session up by code)
    sections/   Home (create/join), Room (voting + reveal), each with its own endpoints/
  store/        configureStore, emptyApi, firebaseBaseQuery, firestoreStream
  config.ts     Card decks
  types.ts      ISession, IParticipant, IRound, IVote
firebase/
  firestore.rules            Security rules
  firestore.indexes.json     Composite index config (empty — none needed yet)
```

## License

[MIT](LICENSE).
