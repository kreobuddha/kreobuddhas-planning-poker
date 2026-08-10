import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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
    await setDoc(doc(db, 'sessions', sessionId, 'participants', userId), {
      name: displayName,
      joinedAt: serverTimestamp(),
    });
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
      const sessionRef = await addDoc(collection(db, 'sessions'), {
        code,
        adminId: userId,
        createdAt: serverTimestamp(),
      });

      await ensureParticipant(sessionRef.id, name.trim());
      navigate(`/room/${code}`);
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
      const snapshot = await getDocs(
        query(collection(db, 'sessions'), where('code', '==', code), limit(1))
      );
      const sessionDoc = snapshot.docs[0];
      if (!sessionDoc) throw new Error('No session found with that code.');

      await ensureParticipant(sessionDoc.id, name.trim());
      navigate(`/room/${code}`);
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
