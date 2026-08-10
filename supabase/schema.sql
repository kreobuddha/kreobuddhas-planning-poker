-- Planning Poker schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- Requires anonymous auth to be enabled: Authentication > Providers > Anonymous Sign-Ins.

create extension if not exists "pgcrypto";

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  admin_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question text not null,
  revealed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  value numeric not null,
  created_at timestamptz not null default now(),
  unique (round_id, participant_id)
);

-- Row Level Security
alter table sessions enable row level security;
alter table participants enable row level security;
alter table rounds enable row level security;
alter table votes enable row level security;

-- sessions: readable by anyone who has the join code / id; only the creator can insert/update
create policy "sessions_select" on sessions for select using (true);
create policy "sessions_insert" on sessions for insert with check (auth.uid() = admin_id);
create policy "sessions_update" on sessions for update using (auth.uid() = admin_id);

-- participants: names are not sensitive; each user manages their own row
create policy "participants_select" on participants for select using (true);
create policy "participants_insert" on participants for insert with check (auth.uid() = user_id);
create policy "participants_delete" on participants for delete using (auth.uid() = user_id);

-- rounds: readable by anyone in the session; only the session admin can create/reveal
create policy "rounds_select" on rounds for select using (true);
create policy "rounds_insert" on rounds for insert with check (
  exists (
    select 1 from sessions s
    where s.id = rounds.session_id and s.admin_id = auth.uid()
  )
);
create policy "rounds_update" on rounds for update using (
  exists (
    select 1 from sessions s
    where s.id = rounds.session_id and s.admin_id = auth.uid()
  )
);

-- votes: everyone can see their OWN vote before reveal; ALL votes become visible once the round is revealed
create policy "votes_select" on votes for select using (
  exists (select 1 from rounds r where r.id = votes.round_id and r.revealed = true)
  or exists (select 1 from participants p where p.id = votes.participant_id and p.user_id = auth.uid())
);
create policy "votes_insert" on votes for insert with check (
  exists (select 1 from participants p where p.id = votes.participant_id and p.user_id = auth.uid())
);
create policy "votes_update" on votes for update using (
  exists (select 1 from participants p where p.id = votes.participant_id and p.user_id = auth.uid())
);

-- Lets any session member see WHO has voted in a round without exposing vote values pre-reveal.
-- security definer bypasses the votes RLS policy above internally, but the function only ever
-- returns participant_id, so vote values stay hidden until the round is revealed.
create or replace function get_vote_status(p_round_id uuid)
returns table (participant_id uuid)
language sql
security definer
set search_path = public
as $$
  select participant_id from votes where round_id = p_round_id;
$$;

-- Realtime: broadcast changes on these tables
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table votes;
