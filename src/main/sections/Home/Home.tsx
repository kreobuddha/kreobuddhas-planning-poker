import './Home.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, TextField } from '@kreobuddha/ui';
import { NAME_MAX_LENGTH } from '@/config';
import { generateSessionCode } from '@/lib/code';
import { readStoredName, storeName } from '@/lib/storedName';
import { useCreateSessionMutation } from '@/main/sections/Home/endpoints/homeApi';
import {
  useCreateParticipantMutation,
  useLazyFetchParticipantQuery,
  useRenameParticipantMutation,
} from '@/main/endpoints/participantsApi';
import { useLazyFindSessionByCodeQuery } from '@/main/endpoints/sessionsApi';
import { errorMessage } from '@/store/queryError';

interface HomeProps {
  userId: string;
}

const Home = ({ userId }: HomeProps): ReactElement => {
  const navigate = useNavigate();
  const [name, setName] = useState(readStoredName);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // One flag per action, not one for the screen: a shared flag put a spinner in both buttons at
  // once, so pressing "Create session" also claimed that joining was in flight.
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [createSession] = useCreateSessionMutation();
  const [fetchParticipant] = useLazyFetchParticipantQuery();
  const [createParticipant] = useCreateParticipantMutation();
  const [renameParticipant] = useRenameParticipantMutation();
  const [findSessionByCode] = useLazyFindSessionByCodeQuery();

  const handleCreate = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter your name first.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const code = generateSessionCode();
      await createSession({ userId, code, name: name.trim() }).unwrap();
      storeName(name.trim());
      navigate(`/room/${code}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not create session.'));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) {
      setError('Enter your name and a session code.');
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      const session = await findSessionByCode(code).unwrap();
      // Rejoining a room you were already in must not rewrite `joinedAt` — the list is ordered
      // by it and the rules freeze it, so a blind upsert would both reorder the room and be
      // refused. One extra document read decides which write this is, and it is a read the room
      // would have made a moment later anyway.
      const existing = await fetchParticipant({ sessionId: session.id, userId }).unwrap();
      const participant = { sessionId: session.id, userId, name: name.trim() };
      await (existing
        ? renameParticipant(participant).unwrap()
        : createParticipant(participant).unwrap());
      storeName(name.trim());
      navigate(`/room/${code}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not join session.'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="home">
      {/* The brand in the app header is a link, not a heading, so without this the page would
          have no level-one heading at all. Hidden rather than drawn: showing it would print the
          product name twice on the one screen where the header sits right above it. */}
      <h1 className="visually-hidden">Planning Poker</h1>
      <p className="home__subtitle">Estimate together, in person-days.</p>

      <TextField
        className="home__name-field"
        label="Your name"
        hint="Everyone in the room sees this."
        value={name}
        maxLength={NAME_MAX_LENGTH}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />

      <div className="home__actions">
        <form onSubmit={handleCreate} className="home__card">
          <h2>Start a session</h2>
          <p>Create a new room and share the code with your team.</p>
          {/* Disabled by the other action, not by its own: a second submit while the first is
              in flight would create a room nobody is sent to. */}
          <Button type="submit" loading={creating} disabled={joining}>
            Create session
          </Button>
        </form>

        <form onSubmit={handleJoin} className="home__card">
          <h2>Join a session</h2>
          <TextField
            label="Session code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="outlined" loading={joining} disabled={creating}>
            Join
          </Button>
        </form>
      </div>

      {error && (
        <Alert
          className="home__error"
          tone="danger"
          live
          onDismiss={() => setError(null)}
          dismissLabel="Dismiss this message"
        >
          {error}
        </Alert>
      )}
    </div>
  );
};

export default Home;
