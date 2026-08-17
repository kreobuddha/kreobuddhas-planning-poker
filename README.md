# Planning Poker

A real-time planning poker tool for team estimation. Create a session, share the code or the
room link, and vote on how long a task will take — in person-days — together.

- An admin creates a session, picks a card deck, and asks a question ("How long will X take?").
- Teammates join with a code and pick a card; picking the same card again clears the vote.
- Votes stay hidden until the admin reveals them, then everyone sees all cards and the average.

## Stack

- React + TypeScript + Vite
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

## Releases

Versions are tagged from CI, never by hand:

1. Add a section to [`CHANGELOG.md`](CHANGELOG.md) under the version being cut, and set the same
   version in `package.json`.
2. Merge that to `master`.
3. **Actions → Release → Run workflow**, entering the version.

The run refuses to tag if the manifest disagrees with what was typed or if the changelog has no
section for it, then tags the commit and publishes the GitHub release with those notes. Nothing is
sent to a package registry — this app is not a package.

## Optional: Claude Code preview config

`.claude/` is gitignored. To let Claude Code start and drive the dev server itself, create
`.claude/launch.json` locally:

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
  only write your own vote, and only while the round is still open — so a revealed result
  can't be rewritten afterwards.
- Picking the card you already selected clears your vote and puts you back to _waiting_.
- All state (participants joining, votes being cast, reveals) syncs live via Firestore
  `onSnapshot` listeners on the `participants`, `rounds`, and `votes` collections.

## Project structure

```
src/
  auth/         userSlice (uid/loading/error), useCheckAuth, store/authApi
  components/   VoteCards, ParticipantList, Results, DeckPicker, CopyLinkButton
  lib/          Firebase client, session code generator, Timestamp conversion
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
