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
          {/* Once the cards are on the table they say who voted, so the badge drops away — but
              only for those who did. A silent participant is exactly what the revealed cards
              cannot show, so that one stays. */}
          {revealed ? (
            !votedIds.has(p.id) && (
              <Badge tone="warning" dot>
                no vote
              </Badge>
            )
          ) : (
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
