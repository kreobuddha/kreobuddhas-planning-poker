import './Room.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { Alert, Spinner, useToast } from '@kreobuddha/ui';
import { CARD_DECKS, deckKeyOf } from '@/config';
import type { DeckKey } from '@/config';
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
  useSetDeckMutation,
  useSubscribeLatestRoundQuery,
  useSubscribeParticipantsQuery,
  useSubscribeVotesQuery,
} from '@/main/sections/Room/endpoints/roomApi';
import DeckPicker from '@/components/DeckPicker/DeckPicker';
import RoomHeader from '@/main/sections/Room/components/RoomHeader/RoomHeader';
import RoomSidebar from '@/main/sections/Room/components/RoomSidebar/RoomSidebar';
import JoinForm from '@/main/sections/Room/components/JoinForm/JoinForm';
import AskQuestionForm from '@/main/sections/Room/components/AskQuestionForm/AskQuestionForm';
import RoundPanel from '@/main/sections/Room/components/RoundPanel/RoundPanel';

interface RoomProps {
  userId: string;
}

const Room = ({ userId }: RoomProps): ReactElement => {
  const { code } = useParams<{ code: string }>();
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

  const { data: participants = [], isLoading: participantsLoading } = useSubscribeParticipantsQuery(
    session?.id ?? skipToken
  );
  const { data: round = null } = useSubscribeLatestRoundQuery(session?.id ?? skipToken);
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

  const isAdmin = session?.adminId === userId;
  const me = participants.find((p) => p.id === userId) ?? null;
  // A vote document's id is its voter's uid, so the votes list doubles as "who has voted".
  const myVote = votes.find((v) => v.id === userId) ?? null;
  const votedIdsSet = new Set(votes.map((v) => v.id));
  const deck = deckKeyOf(session?.deck);
  const votingOpen = Boolean(round && !round.revealed);

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
  const handleVote = async (value: number): Promise<void> => {
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
      <RoomHeader code={session.code} youAre={me?.name ?? null} />

      <div className="room__body">
        <RoomSidebar
          participants={participants}
          votedIds={votedIdsSet}
          revealed={round?.revealed ?? false}
          adminId={session.adminId}
          loading={participantsLoading}
        />

        <main className="room__main">
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
