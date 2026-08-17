import './ParticipantList.scss';
import type { ReactElement } from 'react';
import { Badge } from '@kreobuddha/ui';
import type { IParticipant } from '@/types';

interface ParticipantListProps {
  participants: IParticipant[];
  votedIds: Set<string>;
  revealed: boolean;
  adminId: string;
}

const ParticipantList = ({
  participants,
  votedIds,
  revealed,
  adminId,
}: ParticipantListProps): ReactElement => {
  return (
    <ul className="participant-list">
      {participants.map((p) => (
        <li key={p.id} className="participant-list__item">
          <span className="participant-list__name">
            {p.name}
            {p.id === adminId && <Badge tone="accent">admin</Badge>}
          </span>
          {/* Once the votes are revealed, who voted stops being news — the cards say it. */}
          {!revealed && (
            <Badge tone={votedIds.has(p.id) ? 'success' : 'neutral'} dot>
              {votedIds.has(p.id) ? 'voted' : 'waiting'}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ParticipantList;
