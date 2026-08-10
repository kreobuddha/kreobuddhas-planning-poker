export interface Session {
  id: string;
  code: string;
  adminId: string;
  createdAt: number;
}

// Participant doc ID is the participant's own Firebase Auth uid.
export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Round {
  id: string;
  question: string;
  revealed: boolean;
  createdAt: number;
}

// Vote and VoteStatus doc IDs are the voting participant's uid.
export interface Vote {
  id: string;
  value: number;
  createdAt: number;
}

export interface VoteStatus {
  id: string;
  votedAt: number;
}

export const CARD_VALUES = [0.5, 1, 2, 3, 5, 8, 13, 20] as const;
