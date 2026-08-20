import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { useToast } from '@kreobuddha/ui';
import { deckKeyOf, PRESENCE_HEARTBEAT_MS, PRESENCE_TIMEOUT_MS } from '@/config';
import type { DeckKey } from '@/config';
import type { IParticipant, IRound, ISession, IVote } from '@/types';
import { useFindSessionByCodeQuery } from '@/main/endpoints/sessionsApi';
import {
  useSubscribeParticipantsQuery,
  useSubscribeRoundsQuery,
  useSubscribeVotesQuery,
} from '@/main/sections/Room/endpoints/roomApi';
import { usePresence } from '@/main/sections/Room/usePresence';

interface RoomData {
  session: ISession | undefined;
  sessionError: unknown;
  sessionLoading: boolean;
  participants: IParticipant[];
  participantsLoading: boolean;
  participantsUnreadable: boolean;
  rounds: IRound[];
  round: IRound | null;
  votes: IVote[];
  me: IParticipant | null;
  isAdmin: boolean;
  presentIds: Set<string>;
  votedIds: Set<string>;
  myVote: IVote | null;
  deck: DeckKey;
  votingOpen: boolean;
}

// Everything the room reads: the four subscriptions, what follows from them, and the two effects
// that depend on nothing else. The actions that write live in useRoomActions.
export const useRoomData = (userId: string): RoomData => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
  } = useFindSessionByCodeQuery(code ? code.toUpperCase() : skipToken);

  const {
    data: participants = [],
    isLoading: participantsLoading,
    isError: participantsUnreadable,
  } = useSubscribeParticipantsQuery(session?.id ?? skipToken);
  // Newest first, so the head is the round being played and the tail is the history.
  const { data: rounds = [] } = useSubscribeRoundsQuery(session?.id ?? skipToken);
  const round = rounds[0] ?? null;
  const { data: votes = [] } = useSubscribeVotesQuery(
    session && round ? { sessionId: session.id, roundId: round.id } : skipToken
  );

  // A beat going stale is the one piece of room state no snapshot will ever deliver, so the tick
  // forces the comparison to be made again; the beats themselves live in the participant rows.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), PRESENCE_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = session?.adminId === userId;
  const me = participants.find((p) => p.id === userId) ?? null;
  // A row written before presence existed has no beat at all. It reads as present: an old room
  // full of people the app cannot vouch for is better than one that declares everybody gone.
  //
  // The reader is always in this set, whatever their own row says. They are looking at the room —
  // that is not something to infer from a beat that may not have been sent yet, and reading it
  // from the row instead produced "Voted 0 of 0" on a screen with somebody sitting in front of it.
  const presentIds = new Set(
    participants
      .filter(
        (p) =>
          p.id === userId ||
          p.lastSeenAt === undefined ||
          Date.now() - p.lastSeenAt < PRESENCE_TIMEOUT_MS
      )
      .map((p) => p.id)
  );
  // A vote document's id is its voter's uid, so the votes list doubles as "who has voted".
  const myVote = votes.find((v) => v.id === userId) ?? null;
  const votedIds = new Set(votes.map((v) => v.id));
  const deck = deckKeyOf(session?.deck);
  const votingOpen = Boolean(round && !round.revealed);
  const roomIsLive =
    session === undefined || session.expiresAt === undefined
      ? true
      : Date.now() < session.expiresAt;

  // Nothing to announce before the reader is in the list, and nothing the rules would accept
  // once the room has closed.
  usePresence({ sessionId: session?.id ?? null, userId, active: me !== null && roomIsLive });

  // A closed room takes everyone in it home rather than leaving them standing in a room that
  // accepts nothing. The deadline is waited out exactly instead of polled, so the room closes on
  // the second it is due; `expiresAt` in the past fires the timeout immediately.
  //
  // The guard is not ceremony: under StrictMode the effect runs twice in development, and
  // without it the reader would be told twice that the room had closed.
  const departed = useRef(false);
  const expiresAt = session?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return;

    const leave = (): void => {
      if (departed.current) return;
      departed.current = true;
      toast({ tone: 'info', children: 'This room has closed.' });
      // Replaced, not pushed: Back must not lead into a room that has stopped accepting writes.
      navigate('/', { replace: true });
    };

    const timer = setTimeout(leave, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, navigate, toast]);

  return {
    session,
    sessionError,
    sessionLoading,
    participants,
    participantsLoading,
    participantsUnreadable,
    rounds,
    round,
    votes,
    me,
    isAdmin,
    presentIds,
    votedIds,
    myVote,
    deck,
    votingOpen,
  };
};
