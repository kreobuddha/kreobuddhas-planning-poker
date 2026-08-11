export interface ISession {
  id: string;
  code: string;
  adminId: string;
  createdAt: number;
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
  value: number;
  createdAt: number;
}
