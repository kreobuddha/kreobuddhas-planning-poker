export interface Session {
  id: string;
  code: string;
  admin_id: string;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  user_id: string;
  name: string;
  joined_at: string;
}

export interface Round {
  id: string;
  session_id: string;
  question: string;
  revealed: boolean;
  created_at: string;
}

export interface Vote {
  id: string;
  round_id: string;
  participant_id: string;
  value: number;
  created_at: string;
}

export const CARD_VALUES = [0.5, 1, 2, 3, 5, 8, 13, 20] as const;
