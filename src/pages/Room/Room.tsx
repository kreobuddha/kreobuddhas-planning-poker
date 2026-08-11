import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Participant, Round, Session, Vote } from '@/types';
import VoteCards from '@/components/VoteCards/VoteCards';
import ParticipantList from '@/components/ParticipantList/ParticipantList';
import Results from '@/components/Results/Results';
import './Room.scss';

interface RoomProps {
  userId: string;
}

const Room = ({ userId }: RoomProps) => {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.adminId === userId;
  const me = participants.find((p) => p.id === userId) ?? null;

  // Resolve the session by its join code, then subscribe to participants and the latest round.
  useEffect(() => {
    if (!code) return;
    let unsubParticipants: (() => void) | undefined;
    let unsubRounds: (() => void) | undefined;
    let cancelled = false;

    const load = async () => {
      const snapshot = await getDocs(
        query(collection(db, 'sessions'), where('code', '==', code!.toUpperCase()), limit(1))
      );
      const sessionDoc = snapshot.docs[0];
      if (!sessionDoc || cancelled) {
        if (!sessionDoc) setError('Session not found.');
        return;
      }
      const sessionId = sessionDoc.id;
      setSession({ id: sessionId, ...(sessionDoc.data() as Omit<Session, 'id'>) });

      unsubParticipants = onSnapshot(
        collection(db, 'sessions', sessionId, 'participants'),
        (snap) => {
          setParticipants(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Participant, 'id'>) }))
          );
        }
      );

      unsubRounds = onSnapshot(
        query(
          collection(db, 'sessions', sessionId, 'rounds'),
          orderBy('createdAt', 'desc'),
          limit(1)
        ),
        (snap) => {
          const latest = snap.docs[0];
          setRound(
            latest ? { id: latest.id, ...(latest.data() as Omit<Round, 'id'>) } : null
          );
        }
      );
    };

    load();
    return () => {
      cancelled = true;
      unsubParticipants?.();
      unsubRounds?.();
    };
  }, [code]);

  // My own vote and the vote-status board are always readable pre-reveal.
  useEffect(() => {
    if (!session || !round) {
      setMyVote(null);
      setVotedIds(new Set());
      return;
    }

    const myVoteRef = doc(db, 'sessions', session.id, 'rounds', round.id, 'votes', userId);
    const voteStatusRef = collection(
      db,
      'sessions',
      session.id,
      'rounds',
      round.id,
      'voteStatus'
    );

    const unsubMyVote = onSnapshot(myVoteRef, (snap) => {
      setMyVote(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Vote, 'id'>) } : null);
    });
    const unsubVoteStatus = onSnapshot(voteStatusRef, (snap) => {
      setVotedIds(new Set(snap.docs.map((d) => d.id)));
    });

    return () => {
      unsubMyVote();
      unsubVoteStatus();
    };
  }, [session, round?.id, userId]);

  // The full votes list is only readable once the round is revealed (Firestore security
  // rules can't filter a collection list down to "just my document" the way a single-doc
  // get can, so listing everyone's votes has to wait until the reveal makes them all public).
  useEffect(() => {
    if (!session || !round || !round.revealed) {
      setVotes([]);
      return;
    }

    const votesRef = collection(db, 'sessions', session.id, 'rounds', round.id, 'votes');
    const unsubVotes = onSnapshot(votesRef, (snap) => {
      setVotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Vote, 'id'>) })));
    });

    return () => unsubVotes();
  }, [session, round?.id, round?.revealed]);

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !question.trim()) return;
    try {
      await addDoc(collection(db, 'sessions', session.id, 'rounds'), {
        question: question.trim(),
        revealed: false,
        createdAt: serverTimestamp(),
      });
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start round.');
    }
  };

  const handleVote = async (value: number) => {
    if (!session || !round || !me) return;
    try {
      await Promise.all([
        setDoc(
          doc(db, 'sessions', session.id, 'rounds', round.id, 'votes', userId),
          { value, createdAt: serverTimestamp() }
        ),
        setDoc(
          doc(db, 'sessions', session.id, 'rounds', round.id, 'voteStatus', userId),
          { votedAt: serverTimestamp() }
        ),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit vote.');
    }
  };

  const handleReveal = async () => {
    if (!session || !round) return;
    try {
      await updateDoc(doc(db, 'sessions', session.id, 'rounds', round.id), {
        revealed: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reveal votes.');
    }
  };

  if (error) return <div className="room-error">{error}</div>;
  if (!session) return <div className="room-loading">Loading session…</div>;

  return (
    <div className="room">
      <header className="room-header">
        <h1>Session {session.code}</h1>
        <p>Share this code with your team to let them join.</p>
      </header>

      <div className="room-body">
        <aside className="room-sidebar">
          <h2>Participants</h2>
          <ParticipantList
            participants={participants}
            votedIds={votedIds}
            revealed={round?.revealed ?? false}
            adminId={session.adminId}
          />
        </aside>

        <main className="room-main">
          {isAdmin && (!round || round.revealed) && (
            <form onSubmit={handleAskQuestion} className="ask-form">
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
              <h2 className="question">{round.question}</h2>

              {!round.revealed && (
                <>
                  <VoteCards selected={myVote?.value ?? null} disabled={false} onSelect={handleVote} />
                  {isAdmin && (
                    <button className="reveal-btn" onClick={handleReveal}>
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
