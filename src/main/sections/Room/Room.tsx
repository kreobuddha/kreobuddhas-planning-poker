import './Room.scss';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { Alert, Spinner, useToast } from '@kreobuddha/ui';
import { CARD_DECKS, deckKeyOf, PRESENCE_HEARTBEAT_MS, PRESENCE_TIMEOUT_MS } from '@/config';
import type { CardValue, DeckKey } from '@/config';
import { readStoredName, storeName } from '@/lib/storedName';
import { useFindSessionByCodeQuery } from '@/main/endpoints/sessionsApi';
import { useEnsureParticipantMutation } from '@/main/sections/Home/endpoints/homeApi';
import { errorMessage } from '@/store/queryError';
import {
  useAskQuestionMutation,
  useCastVoteMutation,
  useClearVoteMutation,
  useReopenRoundMutation,
  useRevealVotesMutation,
  useCloseSessionMutation,
  useExtendSessionMutation,
  useSetDeckMutation,
  useSubscribeParticipantsQuery,
  useSubscribeRoundsQuery,
  useSubscribeVotesQuery,
  useTransferAdminMutation,
  useRenameParticipantMutation,
  useRemoveParticipantMutation,
} from '@/main/sections/Room/endpoints/roomApi';
import DeckPicker from '@/components/DeckPicker/DeckPicker';
import RoomHeader from '@/main/sections/Room/components/RoomHeader/RoomHeader';
import RoomSidebar from '@/main/sections/Room/components/RoomSidebar/RoomSidebar';
import JoinForm from '@/main/sections/Room/components/JoinForm/JoinForm';
import AskQuestionForm from '@/main/sections/Room/components/AskQuestionForm/AskQuestionForm';
import RoundPanel from '@/main/sections/Room/components/RoundPanel/RoundPanel';
import SessionDeadline from '@/main/sections/Room/components/SessionDeadline/SessionDeadline';
import { usePresence } from '@/main/sections/Room/usePresence';

interface RoomProps {
  userId: string;
}

const Room = ({ userId }: RoomProps): ReactElement => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [nameDraft, setNameDraft] = useState(readStoredName);

  // An action that failed is news, not a state of the screen: the session behind it is still
  // live and usable, so it is reported over the room and goes away on its own.
  const reportFailure = (err: unknown, fallback: string): void => {
    toast({ tone: 'danger', children: errorMessage(err, fallback) });
  };

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

  const [askQuestion, { isLoading: asking }] = useAskQuestionMutation();
  const [castVote, { isLoading: casting }] = useCastVoteMutation();
  const [clearVote, { isLoading: clearing }] = useClearVoteMutation();
  const [revealVotes, { isLoading: revealing }] = useRevealVotesMutation();
  const [reopenRound, { isLoading: reopening }] = useReopenRoundMutation();
  const [setDeck, { isLoading: settingDeck }] = useSetDeckMutation();
  const [ensureParticipant, { isLoading: joining }] = useEnsureParticipantMutation();
  const [extendSession, { isLoading: extending }] = useExtendSessionMutation();
  const [closeSession, { isLoading: closing }] = useCloseSessionMutation();
  const [transferAdmin] = useTransferAdminMutation();
  const [renameParticipant, { isLoading: renaming }] = useRenameParticipantMutation();
  const [removeParticipant, { isLoading: removing }] = useRemoveParticipantMutation();
  // Which row is busy, not whether any is: one flag put a spinner in every row at once.
  const [handingOverId, setHandingOverId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
  const votedIdsSet = new Set(votes.map((v) => v.id));
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

  const handleAskQuestion = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!session || !question.trim()) return;
    try {
      await askQuestion({ sessionId: session.id, question: question.trim() }).unwrap();
      setQuestion('');
    } catch (err) {
      reportFailure(err, 'Could not start round.');
    }
  };

  // Picking the card you already hold clears the vote, which is the only way back to "waiting".
  const handleVote = async (value: CardValue): Promise<void> => {
    if (!session || !round || !me) return;
    const target = { sessionId: session.id, roundId: round.id, userId };
    try {
      if (myVote?.value === value) {
        await clearVote(target).unwrap();
        return;
      }
      await castVote({ ...target, value }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not submit vote.');
    }
  };

  const handleReveal = async (): Promise<void> => {
    if (!session || !round) return;
    try {
      await revealVotes({ sessionId: session.id, roundId: round.id }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not reveal votes.');
    }
  };

  const handleReopen = async (): Promise<void> => {
    if (!session || !round) return;
    try {
      await reopenRound({ sessionId: session.id, roundId: round.id }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not reopen the round.');
    }
  };

  const handleExtend = async (): Promise<void> => {
    if (!session) return;
    try {
      await extendSession(session.id).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not extend this room.');
    }
  };

  const handleCloseRoom = async (): Promise<void> => {
    if (!session) return;
    try {
      await closeSession(session.id).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not close this room.');
    }
  };

  const handleMakeAdmin = async (nextAdminId: string): Promise<void> => {
    if (!session) return;
    setHandingOverId(nextAdminId);
    try {
      await transferAdmin({ sessionId: session.id, userId: nextAdminId }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not hand the room over.');
    } finally {
      setHandingOverId(null);
    }
  };

  const handleRename = async (name: string): Promise<void> => {
    if (!session) return;
    try {
      await renameParticipant({ sessionId: session.id, userId, name }).unwrap();
      storeName(name);
      setNameDraft(name);
    } catch (err) {
      reportFailure(err, 'Could not change your name.');
    }
  };

  // Clearing the vote is part of leaving, so it only travels with an open round: once the cards
  // are on the table nothing may rewrite them, and the rules say so too.
  const openRoundId = votingOpen && round ? round.id : undefined;

  const handleLeave = async (): Promise<void> => {
    if (!session) return;
    try {
      await removeParticipant({ sessionId: session.id, userId, roundId: openRoundId }).unwrap();
      navigate('/', { replace: true });
    } catch (err) {
      reportFailure(err, 'Could not leave this room.');
    }
  };

  const handleRemove = async (targetId: string): Promise<void> => {
    if (!session) return;
    setRemovingId(targetId);
    try {
      await removeParticipant({
        sessionId: session.id,
        userId: targetId,
        roundId: openRoundId,
      }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not remove this participant.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeckChange = async (next: DeckKey): Promise<void> => {
    if (!session) return;
    try {
      await setDeck({ sessionId: session.id, deck: next }).unwrap();
    } catch (err) {
      reportFailure(err, 'Could not change the deck.');
    }
  };

  // Reaching a room by its link rather than through Home means never having been asked for a
  // name, so ask here instead of leaving an invisible participant who shows up as "Unknown"
  // once the votes are revealed.
  const handleJoin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!session || !nameDraft.trim()) return;
    try {
      await ensureParticipant({ sessionId: session.id, userId, name: nameDraft.trim() }).unwrap();
      storeName(nameDraft.trim());
    } catch (err) {
      reportFailure(err, 'Could not join this session.');
    }
  };

  // Only a session that can't be loaded replaces the screen. A failed action is a toast, because
  // the session behind it is still live and usable.
  if (sessionError) {
    return (
      <div className="room__error">
        <Alert tone="danger" title="This room could not be opened">
          {errorMessage(sessionError, 'Session not found.')}
        </Alert>
      </div>
    );
  }
  if (sessionLoading || !session) {
    return (
      <div className="room__loading">
        <Spinner label="Loading session" />
      </div>
    );
  }

  // Three distinct states, and they must stay distinct: while the list is still arriving the room
  // renders with a placeholder sidebar, an unreadable list says so, and only a list that loaded
  // and does not hold the reader means "you are not in this room yet". Offering the join form on
  // an unreadable list would invite people to join a room they are already in.
  if (participantsUnreadable) {
    return (
      <div className="room__error">
        <Alert tone="warning" title="Connection lost">
          Reconnecting… the room comes back on its own once the connection returns.
        </Alert>
      </div>
    );
  }

  if (!participantsLoading && !me) {
    return (
      <JoinForm
        code={session.code}
        name={nameDraft}
        busy={joining}
        onNameChange={setNameDraft}
        onSubmit={handleJoin}
      />
    );
  }

  return (
    <div className="room">
      <RoomHeader
        code={session.code}
        youAre={me?.name ?? null}
        renaming={renaming}
        leaving={removing}
        // An admin with somebody left to hand the room to has to hand it over first: the rules
        // only accept a new admin who is already a participant, so leaving first would strand
        // the room. The last person in a room may always leave — there is nobody to strand.
        onLeave={isAdmin && participants.length > 1 ? undefined : handleLeave}
        onRename={handleRename}
      />

      <div className="room__body">
        <RoomSidebar
          participants={participants}
          votedIds={votedIdsSet}
          presentIds={presentIds}
          revealed={round?.revealed ?? false}
          adminId={session.adminId}
          loading={participantsLoading}
          youId={userId}
          onMakeAdmin={isAdmin ? handleMakeAdmin : undefined}
          handingOverId={handingOverId}
          onRemove={isAdmin && votingOpen ? handleRemove : undefined}
          removingId={removingId}
          sessionId={session.id}
          pastRounds={rounds.slice(1)}
        />

        <main className="room__main">
          {isAdmin && session.expiresAt !== undefined && (
            <SessionDeadline
              expiresAt={session.expiresAt}
              extending={extending}
              closing={closing}
              onExtend={handleExtend}
              onClose={handleCloseRoom}
            />
          )}

          {isAdmin && (
            <DeckPicker
              value={deck}
              disabled={votingOpen || settingDeck}
              onChange={handleDeckChange}
            />
          )}

          {isAdmin && (!round || round.revealed) && (
            <AskQuestionForm
              question={question}
              busy={asking}
              onQuestionChange={setQuestion}
              onSubmit={handleAskQuestion}
            />
          )}

          {round && (
            <RoundPanel
              round={round}
              deckValues={CARD_DECKS[deck].values}
              votes={votes}
              participants={participants}
              presentIds={presentIds}
              myVote={myVote?.value ?? null}
              isAdmin={isAdmin}
              voting={casting || clearing}
              revealing={revealing}
              reopening={reopening}
              onSelect={handleVote}
              onReveal={handleReveal}
              onReopen={handleReopen}
            />
          )}

          {!round && !isAdmin && <p>Waiting for the admin to ask a question…</p>}
        </main>
      </div>
    </div>
  );
};

export default Room;
