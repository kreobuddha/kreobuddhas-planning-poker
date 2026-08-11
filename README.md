# Planning Poker

A real-time planning poker tool for team estimation. Create a session, share the code,
and vote on how long a task will take — in person-days — together.

- An admin creates a session and asks a question ("How long will X take?").
- Teammates join with a code and pick a card (0.5, 1, 2, 3, 5, 8, 13, 20 person-days).
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

## How it works

- Each visitor is signed in anonymously via Firebase Auth, so no signup is required to
  create or join a session.
- Sessions are looked up by a short join code; the creator becomes the session admin.
- Votes are hidden from other participants until the admin reveals the round — enforced by
  Firestore security rules ([`firebase/firestore.rules`](firebase/firestore.rules)), not just
  the UI. A parallel `voteStatus` doc (no value, just a timestamp) lets everyone see _who_ has
  voted without exposing values early.
- All state (participants joining, votes being cast, reveals) syncs live via Firestore
  `onSnapshot` listeners on the `participants`, `rounds`, `votes`, and `voteStatus` collections.

## Project structure

```
src/
  components/   VoteCards, ParticipantList, Results
  hooks/        useAuth (anonymous sign-in)
  lib/          Firebase client, session code generator
  pages/        Home (create/join), Room (voting + reveal)
firebase/
  firestore.rules            Security rules
  firestore.indexes.json     Composite index config (empty — none needed yet)
```
