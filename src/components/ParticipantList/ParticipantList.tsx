import './ParticipantList.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';
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
            {p.id === adminId && <span className="participant-list__badge">admin</span>}
          </span>
          <span
            className={clsx(
              'participant-list__status',
              votedIds.has(p.id) && 'participant-list__status--voted'
            )}
          >
            {revealed ? '' : votedIds.has(p.id) ? 'voted' : 'waiting'}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default ParticipantList;
