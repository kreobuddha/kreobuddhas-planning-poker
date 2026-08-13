import './Room.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { CARD_DECKS, DEFAULT_DECK } from '@/config';
import type { DeckKey } from '@/config';
import { useFindSessionByCodeQuery } from '@/main/endpoints/sessionsApi';
import { errorMessage } from '@/store/queryError';
import {
  useAskQuestionMutation,
  useCastVoteMutation,
  useRevealVotesMutation,
  useSetDeckMutation,
  useSubscribeLatestRoundQuery,
  useSubscribeMyVoteQuery,
  useSubscribeParticipantsQuery,
  useSubscribeVoteStatusQuery,
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

  const {
    data: session,
    error: sessionError,
    isLoading: sessionLoading,
  } = useFindSessionByCodeQuery(code ? code.toUpperCase() : skipToken);

  const { data: participants = [] } = useSubscribeParticipantsQuery(session?.id ?? skipToken);
  const { data: round = null } = useSubscribeLatestRoundQuery(session?.id ?? skipToken);
  const { data: myVote = null } = useSubscribeMyVoteQuery(
    session && round ? { sessionId: session.id, roundId: round.id, userId } : skipToken
  );
  const { data: votedIds = [] } = useSubscribeVoteStatusQuery(
    session && round ? { sessionId: session.id, roundId: round.id } : skipToken
  );
  const { data: votes = [] } = useSubscribeVotesQuery(
    session && round?.revealed ? { sessionId: session.id, roundId: round.id } : skipToken
  );

  const [askQuestion] = useAskQuestionMutation();
  const [castVote] = useCastVoteMutation();
  const [revealVotes] = useRevealVotesMutation();
  const [setDeck] = useSetDeckMutation();

  const isAdmin = session?.adminId === userId;
  const me = participants.find((p) => p.id === userId) ?? null;
  const votedIdsSet = new Set(votedIds);
  const deck = session?.deck ?? DEFAULT_DECK;
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

  const handleVote = async (value: number): Promise<void> => {
    if (!session || !round || !me) return;
    try {
      await castVote({ sessionId: session.id, roundId: round.id, userId, value }).unwrap();
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

  if (error || sessionError) {
    return <div className="room__error">{error ?? errorMessage(sessionError, 'Session not found.')}</div>;
  }
  if (sessionLoading || !session) return <div className="room__loading">Loading session…</div>;

  return (
    <div className="room">
      <header className="room__header">
        <Link to="/" className="room__back">
          ← Home
        </Link>
        <div className="room__title-row">
          <h1>Session {session.code}</h1>
          {isAdmin && <CopyLinkButton />}
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
              <button type="submit">Start voting</button>
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
                    disabled={false}
                    onSelect={handleVote}
                  />
                  {isAdmin && (
                    <button className="room__reveal-btn" onClick={handleReveal}>
                      Reveal cards
                    </button>
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
