# Planning Poker

A real-time planning poker tool for team estimation. Create a session, share the code,
and vote on how long a task will take — in person-days — together.

- An admin creates a session and asks a question ("How long will X take?").
- Teammates join with a code and pick a card (0.5, 1, 2, 3, 5, 8, 13, 20 person-days).
- Votes stay hidden until the admin reveals them, then everyone sees all cards and the average.

## Stack

- React + TypeScript + Vite
- [Supabase](https://supabase.com) — Postgres, Realtime, anonymous auth
- react-router-dom

## Setup

1. Create a Supabase project.
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**.
3. In the **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) to create the
   tables, row-level security policies, and enable realtime.
4. Copy `.env.example` to `.env` and fill in your project's URL and anon key:

   ```bash
   cp .env.example .env
   ```

5. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

## How it works

- Each visitor is signed in anonymously via Supabase Auth, so no signup is required to
  create or join a session.
- Sessions are looked up by a short join code; the creator becomes the session admin.
- Votes are hidden from other participants until the admin reveals the round — enforced
  by Postgres row-level security, not just the UI — and a security-definer RPC
  (`get_vote_status`) lets everyone see *who* has voted without exposing values early.
- All state (participants joining, votes being cast, reveals) syncs live via Supabase
  Realtime subscriptions on the `participants`, `rounds`, and `votes` tables.

## Project structure

```
src/
  components/   VoteCards, ParticipantList, Results
  hooks/        useAuth (anonymous sign-in)
  lib/          Supabase client, session code generator
  pages/        Home (create/join), Room (voting + reveal)
supabase/
  schema.sql    Tables, RLS policies, realtime config
```
