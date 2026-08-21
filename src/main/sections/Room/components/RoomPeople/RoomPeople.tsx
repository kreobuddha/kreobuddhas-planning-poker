import './RoomPeople.scss';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Dialog, IconButton, Tooltip } from '@kreobuddha/ui';
import ParticipantList from '@/components/ParticipantList/ParticipantList';
import type { IParticipant } from '@/types';

interface RoomPeopleProps {
  participants: IParticipant[];
  votedIds: Set<string>;
  presentIds: Set<string>;
  revealed: boolean;
  adminId: string;
  youId: string;
  onMakeAdmin?: (userId: string) => void;
  handingOverId: string | null;
  onRemove?: (userId: string) => void;
  removingId: string | null;
}

const PeopleIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
    />
    <circle cx="9" cy="7" r="4" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
    />
  </svg>
);

// Who is in the room is on the table; this is what to do about them. Handing the room over and
// removing somebody are the admin's alone, and they live here rather than beside the seats so the
// table stays something to read rather than something to operate.
const RoomPeople = ({
  participants,
  votedIds,
  presentIds,
  revealed,
  adminId,
  youId,
  onMakeAdmin,
  handingOverId,
  onRemove,
  removingId,
}: RoomPeopleProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const label = 'Manage people';

  return (
    <>
      <Tooltip content={label} placement="bottom">
        <IconButton
          label={label}
          // IconButton falls back to `label` as the native `title`, which would draw a second
          // tooltip beside this one.
          title=""
          icon={<PeopleIcon />}
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
        />
      </Tooltip>

      <Dialog
        open={open}
        title={`People (${participants.length})`}
        dismissible
        onClose={() => setOpen(false)}
      >
        <div className="room-people__list">
          <ParticipantList
            participants={participants}
            votedIds={votedIds}
            presentIds={presentIds}
            revealed={revealed}
            adminId={adminId}
            youId={youId}
            onMakeAdmin={onMakeAdmin}
            handingOverId={handingOverId}
            onRemove={onRemove}
            removingId={removingId}
          />
        </div>
      </Dialog>
    </>
  );
};

export default RoomPeople;
