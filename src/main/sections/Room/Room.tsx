import './Room.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useFindSessionByCodeQuery } from '@/main/endpoints/sessionsApi';
import {
  useAskQuestionMutation,
  useCastVoteMutation,
  useRevealVotesMutation,
  useSubscribeLatestRoundQuery,
  useSubscribeMyVoteQuery,
  useSubscribeParticipantsQuery,
  useSubscribeVoteStatusQuery,
  useSubscribeVotesQuery,
} from '@/main/sections/Room/endpoints/roomApi';
import VoteCards from '@/components/VoteCards/VoteCards';
import ParticipantList from '@/components/ParticipantList/ParticipantList';
import Results from '@/components/Results/Results';

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
  } = useFindSessionByCodeQuery(code?.toUpperCase() ?? '', { skip: !code });

  const { data: participants = [] } = useSubscribeParticipantsQuery(session?.id ?? '', {
    skip: !session,
  });
  const { data: round = null } = useSubscribeLatestRoundQuery(session?.id ?? '', {
    skip: !session,
  });
  const { data: myVote = null } = useSubscribeMyVoteQuery(
    session && round ? { sessionId: session.id, roundId: round.id, userId } : { sessionId: '', roundId: '', userId },
    { skip: !session || !round }
  );
  const { data: votedIds = [] } = useSubscribeVoteStatusQuery(
    session && round ? { sessionId: session.id, roundId: round.id } : { sessionId: '', roundId: '' },
    { skip: !session || !round }
  );
  const { data: votes = [] } = useSubscribeVotesQuery(
    session && round ? { sessionId: session.id, roundId: round.id } : { sessionId: '', roundId: '' },
    { skip: !session || !round?.revealed }
  );

  const [askQuestion] = useAskQuestionMutation();
  const [castVote] = useCastVoteMutation();
  const [revealVotes] = useRevealVotesMutation();

  const isAdmin = session?.adminId === userId;
  const me = participants.find((p) => p.id === userId) ?? null;
  const votedIdsSet = new Set(votedIds);

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

  if (error || sessionError) {
    return <div className="room__error">{error ?? errorMessage(sessionError, 'Session not found.')}</div>;
  }
  if (sessionLoading || !session) return <div className="room__loading">Loading session…</div>;

  return (
    <div className="room">
      <header className="room__header">
        <h1>Session {session.code}</h1>
        <p>Share this code with your team to let them join.</p>
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

const errorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object' && 'error' in err && typeof err.error === 'string') {
    return err.error;
  }
  return fallback;
};

export default Room;
