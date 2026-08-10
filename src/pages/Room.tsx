import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Participant, Round, Session, Vote } from '../types';
import VoteCards from '../components/VoteCards';
import ParticipantList from '../components/ParticipantList';
import Results from '../components/Results';

interface RoomProps {
  userId: string;
}

export default function Room({ userId }: RoomProps) {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.admin_id === userId;
  const me = participants.find((p) => p.user_id === userId) ?? null;
  const myVote = round ? votes.find((v) => v.participant_id === me?.id) ?? null : null;

  const refreshVoteStatus = useCallback(async (roundId: string) => {
    const { data, error: rpcError } = await supabase.rpc('get_vote_status', {
      p_round_id: roundId,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setVotedIds(new Set((data ?? []).map((row: { participant_id: string }) => row.participant_id)));
  }, []);

  const refreshVotes = useCallback(async (roundId: string) => {
    const { data, error: votesError } = await supabase
      .from('votes')
      .select()
      .eq('round_id', roundId);
    if (votesError) {
      setError(votesError.message);
      return;
    }
    setVotes(data ?? []);
  }, []);

  // Load session + participants, then subscribe to realtime changes.
  useEffect(() => {
    if (!code) return;
    let sessionId: string;

    async function load() {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select()
        .eq('code', code!.toUpperCase())
        .single();
      if (sessionError || !sessionData) {
        setError('Session not found.');
        return;
      }
      setSession(sessionData);
      sessionId = sessionData.id;

      const { data: participantsData } = await supabase
        .from('participants')
        .select()
        .eq('session_id', sessionId);
      setParticipants(participantsData ?? []);

      const { data: roundsData } = await supabase
        .from('rounds')
        .select()
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);
      const latestRound = roundsData?.[0] ?? null;
      setRound(latestRound);
      if (latestRound) {
        await refreshVotes(latestRound.id);
        await refreshVoteStatus(latestRound.id);
      }
    }

    load();

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        (payload) => {
          const row = (payload.new ?? payload.old) as Participant;
          if (row.session_id !== sessionId) return;
          setParticipants((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((p) => p.id !== row.id);
            }
            const next = prev.filter((p) => p.id !== row.id);
            return [...next, payload.new as Participant];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds' },
        (payload) => {
          const row = payload.new as Round;
          if (!row || row.session_id !== sessionId) return;
          setRound(row);
          setVotes([]);
          refreshVotes(row.id);
          refreshVoteStatus(row.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          const row = (payload.new ?? payload.old) as Vote;
          setRound((currentRound) => {
            if (currentRound && row.round_id === currentRound.id) {
              refreshVotes(currentRound.id);
              refreshVoteStatus(currentRound.id);
            }
            return currentRound;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, refreshVotes, refreshVoteStatus]);

  async function handleAskQuestion(e: FormEvent) {
    e.preventDefault();
    if (!session || !question.trim()) return;
    const { error: insertError } = await supabase.from('rounds').insert({
      session_id: session.id,
      question: question.trim(),
    });
    if (insertError) setError(insertError.message);
    setQuestion('');
  }

  async function handleVote(value: number) {
    if (!round || !me) return;
    const { error: voteError } = await supabase
      .from('votes')
      .upsert(
        { round_id: round.id, participant_id: me.id, value },
        { onConflict: 'round_id,participant_id' }
      );
    if (voteError) setError(voteError.message);
  }

  async function handleReveal() {
    if (!round) return;
    const { error: revealError } = await supabase
      .from('rounds')
      .update({ revealed: true })
      .eq('id', round.id);
    if (revealError) setError(revealError.message);
  }

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
            adminId={session.admin_id}
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
}
