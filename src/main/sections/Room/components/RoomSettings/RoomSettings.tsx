import './RoomSettings.scss';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button, Dialog, IconButton, Tooltip } from '@kreobuddha/ui';
import DeckPicker from '@/components/DeckPicker/DeckPicker';
import type { DeckKey } from '@/config';

interface RoomSettingsProps {
  deck: DeckKey;
  /** True while a round is open — the deck may not change under a vote in progress. */
  deckLocked: boolean;
  closing: boolean;
  onDeckChange: (deck: DeckKey) => void;
  onCloseRoom: () => void;
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

// A dialog rather than a toggletip: the deck is a radio group and closing the room is
// irreversible, and both want the modal's focus trap rather than a bubble that any stray click
// dismisses.
const RoomSettings = ({
  deck,
  deckLocked,
  closing,
  onDeckChange,
  onCloseRoom,
}: RoomSettingsProps): ReactElement => {
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
        <DeckPicker value={deck} disabled={deckLocked} onChange={onDeckChange} />

        <div className="room-settings__danger">
          <h3 className="room-settings__danger-title">Close this room</h3>
          <p className="room-settings__danger-text">
            Voting stops for everyone and cannot be resumed.
          </p>
          <Button variant="outlined" danger onClick={() => setConfirmingClose(true)}>
            Close room
          </Button>
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

export default RoomSettings;
