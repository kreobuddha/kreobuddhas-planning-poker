import './ParticipantList.scss';
import type { ReactElement } from 'react';
import { Badge, Button } from '@kreobuddha/ui';
import type { IParticipant } from '@/types';

interface ParticipantListProps {
  participants: IParticipant[];
  votedIds: Set<string>;
  revealed: boolean;
  adminId: string;
  /** Absent for everyone but the admin, which is what hides the handover control. */
  onMakeAdmin?: (userId: string) => void;
  handingOver?: boolean;
}

const ParticipantList = ({
  participants,
  votedIds,
  revealed,
  adminId,
  onMakeAdmin,
  handingOver = false,
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
          {/* Handing the room over is the only way back from an admin who closed their laptop,
              so it sits next to the person rather than behind a menu. */}
          {onMakeAdmin && p.id !== adminId && (
            <Button
              size="sm"
              variant="ghost"
              loading={handingOver}
              onClick={() => onMakeAdmin(p.id)}
            >
              Make admin
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ParticipantList;
