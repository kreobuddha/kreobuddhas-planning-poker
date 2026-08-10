import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  votedIds: Set<string>;
  revealed: boolean;
  adminId: string;
}

export default function ParticipantList({
  participants,
  votedIds,
  revealed,
  adminId,
}: ParticipantListProps) {
  return (
    <ul className="participant-list">
      {participants.map((p) => (
        <li key={p.id}>
          <span className="participant-name">
            {p.name}
            {p.user_id === adminId && <span className="badge">admin</span>}
          </span>
          <span className={`vote-status ${votedIds.has(p.id) ? 'voted' : ''}`}>
            {revealed ? '' : votedIds.has(p.id) ? 'voted' : 'waiting'}
          </span>
        </li>
      ))}
    </ul>
  );
}
