import type { CardValue, DeckKey } from '@/config';

export interface ISession {
  id: string;
  code: string;
  adminId: string;
  createdAt: number;
  // Optional: sessions created before decks existed have no value here, so read sites fall
  // back to DEFAULT_DECK.
  deck?: DeckKey;
  // Millis, converted from a Firestore Timestamp on read. Optional for the same reason as
  // `deck`: sessions created before lifetimes existed carry no deadline and never expire.
  expiresAt?: number;
}

// Participant doc ID is the participant's own Firebase Auth uid.
export interface IParticipant {
  id: string;
  name: string;
  joinedAt: number;
  // Millis on the writer's own clock, not a serverTimestamp(): a pending sentinel reads back as
  // null locally, so the tab writing the beat would show itself as away until the server
  // acknowledged it. The cost is clock skew between machines — the same trade already made for
  // `expiresAt`, which is compared against Date.now() too. Optional: a row written before
  // presence existed carries no beat, and is read as present rather than as a ghost.
  lastSeenAt?: number;
}

export interface IRound {
  id: string;
  question: string;
  revealed: boolean;
  createdAt: number;
}

// Vote doc ID is the voting participant's uid.
export interface IVote {
  id: string;
  value: CardValue;
  createdAt: number;
}
