import './RoomMenu.scss';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button, Dialog, IconButton, Tooltip } from '@kreobuddha/ui';
import DeckPicker from '@/components/DeckPicker/DeckPicker';
import ParticipantList from '@/components/ParticipantList/ParticipantList';
import type { DeckKey } from '@/config';
import type { IParticipant } from '@/types';

interface RoomMenuProps {
  deck: DeckKey;
  /** True while a round is open — the deck may not change under a vote in progress. */
  deckLocked: boolean;
  closing: boolean;
  onDeckChange: (deck: DeckKey) => void;
  onCloseRoom: () => void;
  participants: IParticipant[];
  votedIds: Set<string>;
  presentIds: Set<string>;
  revealed: boolean;
  adminId: string;
  youId: string;
  onMakeAdmin: (userId: string) => void;
  handingOverId: string | null;
  /** Absent once the cards are down: a vote cannot be cleared then, so nobody can be removed. */
  onRemove?: (userId: string) => void;
  removingId: string | null;
}

const GearIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
    />
  </svg>
);

// Everything the admin can do to the room, in one panel. It was two — a settings dialog and a
// people dialog — and two icons side by side asking to be told apart is a worse question than one
// panel with headings in it. A dialog rather than a bubble: it holds a radio group, a list of
// people and an irreversible action, all of which want a modal's focus rather than something a
// stray click dismisses.
const RoomMenu = ({
  deck,
  deckLocked,
  closing,
  onDeckChange,
  onCloseRoom,
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
}: RoomMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const label = 'Room settings';

  return (
    <>
      <Tooltip content={label} placement="bottom">
        <IconButton
          label={label}
          // IconButton falls back to `label` as the native `title`, which would draw a second
          // tooltip beside this one.
          title=""
          icon={<GearIcon />}
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
        />
      </Tooltip>

      <Dialog open={open} title={label} dismissible onClose={() => setOpen(false)}>
        <div className="room-menu">
          <DeckPicker value={deck} disabled={deckLocked} onChange={onDeckChange} />

          <section>
            <h3 className="room-menu__heading">People ({participants.length})</h3>
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
          </section>

          <section className="room-menu__danger">
            <h3 className="room-menu__heading">Close this room</h3>
            <p className="room-menu__text">Voting stops for everyone and cannot be resumed.</p>
            <Button variant="outlined" danger onClick={() => setConfirmingClose(true)}>
              Close room
            </Button>
          </section>
        </div>
      </Dialog>

      {/* A second dialog rather than a confirmation inside the first: the native dialog element
          owns the top layer, and nesting one panel's question inside another's body would leave
          the settings behind it dismissible while the question was still standing. */}
      <Dialog
        open={confirmingClose}
        title="Close this room?"
        dismissible
        onClose={() => setConfirmingClose(false)}
        footer={
          <>
            <Button variant="outlined" onClick={() => setConfirmingClose(false)}>
              Keep it open
            </Button>
            <Button
              danger
              loading={closing}
              onClick={() => {
                setConfirmingClose(false);
                setOpen(false);
                onCloseRoom();
              }}
            >
              Close room
            </Button>
          </>
        }
      >
        Voting stops immediately and cannot be resumed — a closed room is an expired one. Everyone
        in the room, you included, is taken back to the home page.
      </Dialog>
    </>
  );
};

export default RoomMenu;
