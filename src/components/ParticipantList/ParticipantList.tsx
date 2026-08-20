import './ParticipantList.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';
import { Badge, Button } from '@kreobuddha/ui';
import type { IParticipant } from '@/types';

interface ParticipantListProps {
  participants: IParticipant[];
  votedIds: Set<string>;
  /** Who the room is still counting on — everyone whose tab has beaten recently enough. */
  presentIds: Set<string>;
  revealed: boolean;
  adminId: string;
  /** Absent for everyone but the admin, which is what hides the handover control. */
  onMakeAdmin?: (userId: string) => void;
  handingOver?: boolean;
  /**
   * Absent unless the reader is the admin and the round is open. Removing somebody takes their
   * vote with them, and a vote cannot be cleared once the cards are on the table — so the
   * control is not offered then rather than offered and refused.
   */
  onRemove?: (userId: string) => void;
  removing?: boolean;
}

const ParticipantList = ({
  participants,
  votedIds,
  presentIds,
  revealed,
  adminId,
  onMakeAdmin,
  handingOver = false,
  onRemove,
  removing = false,
}: ParticipantListProps): ReactElement => {
  return (
    <ul className="participant-list">
      {participants.map((p) => (
        <li
          key={p.id}
          className={clsx(
            'participant-list__item',
            !presentIds.has(p.id) && 'participant-list__item--away'
          )}
        >
          <span className="participant-list__name">
            {p.name}
            {p.id === adminId && <Badge tone="accent">admin</Badge>}
          </span>
          {/* Once the cards are on the table they say who voted, so the badge drops away — but
              only for those who did. A silent participant is exactly what the revealed cards
              cannot show, so that one stays. */}
          {/* "away" replaces "waiting", it does not accompany it: a tab that stopped beating is
              not somebody still thinking, and showing both would say the room is waiting on
              them. A vote already cast still shows, because it still counts. */}
          {revealed ? (
            !votedIds.has(p.id) && (
              <Badge tone="warning" dot>
                no vote
              </Badge>
            )
          ) : votedIds.has(p.id) ? (
            <Badge tone="success" dot>
              voted
            </Badge>
          ) : (
            <Badge tone="neutral" dot>
              {presentIds.has(p.id) ? 'waiting' : 'away'}
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
          {/* Never on the admin's own row: removing the admin would leave the room with nobody
              who can appoint one, which is the state handing over exists to prevent. */}
          {onRemove && p.id !== adminId && (
            <Button
              size="sm"
              variant="ghost"
              danger
              loading={removing}
              onClick={() => onRemove(p.id)}
            >
              Remove
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ParticipantList;
