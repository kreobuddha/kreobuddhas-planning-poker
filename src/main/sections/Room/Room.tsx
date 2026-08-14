import './Room.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { Button } from '@kreobuddha/ui';
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
  useRevealVotesMutation,
  useSetDeckMutation,
  useSubscribeLatestRoundQuery,
  useSubscribeParticipantsQuery,
  useSubscribeVotesQuery,
} from '@/main/sections/Room/endpoints/roomApi';
import VoteCards from '@/components/VoteCards/VoteCards';
import ParticipantList from '@/components/ParticipantList/ParticipantList';
import Results from '@/components/Results/Results';
import DeckPicker from '@/components/DeckPicker/DeckPicker';
import CopyLinkButton from '@/components/CopyLinkButton/CopyLinkButton';

interface RoomProps {
  userId: string;
}

const Room = ({ userId }: RoomProps): ReactElement => {
  const { code } = useParams<{ code: string }>();
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(readStoredName);

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
  } = useFindSessionByCodeQuery(code ? code.toUpperCase() : skipToken);

  const { data: participants = [], isLoading: participantsLoading } =
    useSubscribeParticipantsQuery(session?.id ?? skipToken);
  const { data: round = null } = useSubscribeLatestRoundQuery(session?.id ?? skipToken);
  const { data: votes = [] } = useSubscribeVotesQuery(
    session && round ? { sessionId: session.id, roundId: round.id } : skipToken
  );

  const [askQuestion] = useAskQuestionMutation();
  const [castVote, { isLoading: casting }] = useCastVoteMutation();
  const [clearVote, { isLoading: clearing }] = useClearVoteMutation();
  const [revealVotes] = useRevealVotesMutation();
  const [setDeck] = useSetDeckMutation();
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
      setError(errorMessage(err, 'Could not start round.'));
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
      setError(errorMessage(err, 'Could not submit vote.'));
    }
  };

  const handleReveal = async (): Promise<void> => {
    if (!session || !round) return;
    try {
      await revealVotes({ sessionId: session.id, roundId: round.id }).unwrap();
    } catch (err) {
      setError(errorMessage(err, 'Could not reveal votes.'));
    }
  };

  const handleDeckChange = async (next: DeckKey): Promise<void> => {
    if (!session) return;
    try {
      await setDeck({ sessionId: session.id, deck: next }).unwrap();
    } catch (err) {
      setError(errorMessage(err, 'Could not change the deck.'));
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
      setError(errorMessage(err, 'Could not join this session.'));
    }
  };

  // Only a session that can't be loaded replaces the screen. A failed action is reported over
  // the room and dismissed, because the session behind it is still live and usable.
  if (sessionError) {
    return <div className="room__error">{errorMessage(sessionError, 'Session not found.')}</div>;
  }
  if (sessionLoading || !session) return <div className="room__loading">Loading session…</div>;

  if (!participantsLoading && !me) {
    return (
      <div className="room room--joining">
        <form onSubmit={handleJoin} className="room__join-form">
          <h1>Join session {session.code}</h1>
          <label htmlFor="room-name">Your name</label>
          <input
            id="room-name"
            placeholder="Your name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <Button type="submit" loading={joining} disabled={!nameDraft.trim()}>
            Join
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="room">
      {error && (
        <div className="room__banner" role="alert">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <header className="room__header">
        <Link to="/" className="room__back">
          ← Home
        </Link>
        <div className="room__title-row">
          <h1>Session {session.code}</h1>
          <CopyLinkButton />
        </div>
        <p>
          Share this code with your team to let them join.
          {me && <span className="room__you">You are {me.name}</span>}
        </p>
      </header>

      <div className="room__body">
        <aside className="room__sidebar">
          <h2>Participants</h2>
          <ParticipantList
            participants={participants}
            votedIds={votedIdsSet}
            revealed={round?.revealed ?? false}
            adminId={session.adminId}
          />
        </aside>

        <main className="room__main">
          {isAdmin && (
            <DeckPicker value={deck} disabled={votingOpen} onChange={handleDeckChange} />
          )}

          {isAdmin && (!round || round.revealed) && (
            <form onSubmit={handleAskQuestion} className="room__ask-form">
              <h2>Ask a question</h2>
              <input
                placeholder="What are we estimating?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button type="submit">Start voting</Button>
            </form>
          )}

          {round && (
            <div className="round">
              <h2 className="room__question">{round.question}</h2>

              {!round.revealed && (
                <>
                  <VoteCards
                    values={CARD_DECKS[deck].values}
                    selected={myVote?.value ?? null}
                    disabled={casting || clearing}
                    onSelect={handleVote}
                  />
                  {isAdmin && (
                    <Button onClick={handleReveal}>Reveal cards</Button>
                  )}
                </>
              )}

              {round.revealed && <Results votes={votes} participants={participants} />}
            </div>
          )}

          {!round && !isAdmin && <p>Waiting for the admin to ask a question…</p>}
        </main>
      </div>
    </div>
  );
};

export default Room;
