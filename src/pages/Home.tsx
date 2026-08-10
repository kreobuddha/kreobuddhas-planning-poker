import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateSessionCode } from '../lib/code';

interface HomeProps {
  userId: string;
}

export default function Home({ userId }: HomeProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensureParticipant(sessionId: string, displayName: string) {
    const { error: participantError } = await supabase
      .from('participants')
      .upsert(
        { session_id: sessionId, user_id: userId, name: displayName },
        { onConflict: 'session_id,user_id' }
      );
    if (participantError) throw participantError;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter your name first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = generateSessionCode();
      const { data, error: sessionError } = await supabase
        .from('sessions')
        .insert({ code, admin_id: userId })
        .select()
        .single();
      if (sessionError) throw sessionError;

      await ensureParticipant(data.id, name.trim());
      navigate(`/room/${code}`, { state: { name: name.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create session.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) {
      setError('Enter your name and a session code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      const { data, error: sessionError } = await supabase
        .from('sessions')
        .select()
        .eq('code', code)
        .single();
      if (sessionError || !data) throw new Error('No session found with that code.');

      await ensureParticipant(data.id, name.trim());
      navigate(`/room/${code}`, { state: { name: name.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join session.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home">
      <h1>Planning Poker</h1>
      <p className="subtitle">Estimate together, in person-days.</p>

      <input
        className="name-input"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="home-actions">
        <form onSubmit={handleCreate} className="home-card">
          <h2>Start a session</h2>
          <p>Create a new room and share the code with your team.</p>
          <button type="submit" disabled={busy}>
            Create session
          </button>
        </form>

        <form onSubmit={handleJoin} className="home-card">
          <h2>Join a session</h2>
          <input
            placeholder="Session code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            Join
          </button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
