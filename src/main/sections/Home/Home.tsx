import './Home.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSessionCode } from '@/lib/code';
import { useCreateSessionMutation, useEnsureParticipantMutation } from '@/main/sections/Home/endpoints/homeApi';
import { useLazyFindSessionByCodeQuery } from '@/main/endpoints/sessionsApi';

interface HomeProps {
  userId: string;
}

const Home = ({ userId }: HomeProps): ReactElement => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createSession] = useCreateSessionMutation();
  const [ensureParticipant] = useEnsureParticipantMutation();
  const [findSessionByCode] = useLazyFindSessionByCodeQuery();

  const handleCreate = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter your name first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = generateSessionCode();
      const session = await createSession({ userId, code }).unwrap();
      await ensureParticipant({ sessionId: session.id, userId, name: name.trim() }).unwrap();
      navigate(`/room/${code}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not create session.'));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) {
      setError('Enter your name and a session code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      const session = await findSessionByCode(code).unwrap();
      await ensureParticipant({ sessionId: session.id, userId, name: name.trim() }).unwrap();
      navigate(`/room/${code}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not join session.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home">
      <h1>Planning Poker</h1>
      <p className="home__subtitle">Estimate together, in person-days.</p>

      <input
        className="home__name-input"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="home__actions">
        <form onSubmit={handleCreate} className="home__card">
          <h2>Start a session</h2>
          <p>Create a new room and share the code with your team.</p>
          <button type="submit" disabled={busy}>
            Create session
          </button>
        </form>

        <form onSubmit={handleJoin} className="home__card">
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

      {error && <p className="home__error">{error}</p>}
    </div>
  );
};

const errorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object' && 'error' in err && typeof err.error === 'string') {
    return err.error;
  }
  return fallback;
};

export default Home;
