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
