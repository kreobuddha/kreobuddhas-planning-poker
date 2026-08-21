import './UserMenu.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Button, Dialog, IconButton, TextField, Toggletip } from '@kreobuddha/ui';
import { NAME_MAX_LENGTH } from '@/config';

interface UserMenuProps {
  /** The current participant's name. Doubles as the menu's trigger. */
  name: string;
  renaming: boolean;
  leaving: boolean;
  /**
   * Absent while the admin still has somebody to hand the room to. The rules only accept a new
   * admin who is already a participant, so an admin who left first could never appoint one —
   * the room would be stranded exactly as it is when an admin closes their laptop.
   */
  onLeave?: () => void;
  onRename: (name: string) => void;
}

const PersonIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
    />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Both dialogs are rendered outside the toggletip's content rather than inside it. The content is
// mounted only while the bubble is open, and the bubble closes on the first pointer down outside
// it — which is the click that lands in the dialog. A dialog opened from inside the content would
// unmount itself the moment it was touched.
const UserMenu = ({ name, renaming, leaving, onLeave, onRename }: UserMenuProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const submitName = (e: FormEvent): void => {
    e.preventDefault();
    const next = draft?.trim() ?? '';
    if (next.length > 0 && next !== name) onRename(next);
    setDraft(null);
  };

  return (
    <>
      <Toggletip
        className="user-menu__bubble"
        placement="bottom"
        content={
          <div className="user-menu__items">
            {/* The name lives in the bubble rather than on the trigger. On the trigger it was a
                second button competing with the room's own controls for the top of the screen;
                here it is what the menu is about, so it opens with it. */}
            <p className="user-menu__who">{name}</p>
            <Button size="sm" variant="ghost" onClick={() => setDraft(name)}>
              Change name
            </Button>
            {onLeave !== undefined && (
              <Button
                size="sm"
                variant="ghost"
                danger
                loading={leaving}
                onClick={() => setConfirmingLeave(true)}
              >
                Leave room
              </Button>
            )}
          </div>
        }
      >
        {/* No Tooltip around this one, unlike the room's other header icons: IconButton falls back
            to `label` as the native title, and a Toggletip and a Tooltip fighting over the same
            trigger is one owner too many for it. */}
        <IconButton label={`You, ${name}`} icon={<PersonIcon />} variant="ghost" size="sm" />
      </Toggletip>

      <Dialog
        open={draft !== null}
        title="Change your name"
        description="Everyone in the room sees this."
        dismissible
        // The panel holds something typed, and a stray click beside it would throw it away.
        dismissOnBackdrop={false}
        onClose={() => setDraft(null)}
      >
        <form className="user-menu__rename" onSubmit={submitName}>
          <TextField
            label="Your name"
            value={draft ?? ''}
            maxLength={NAME_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="user-menu__rename-actions">
            <Button type="button" variant="outlined" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={renaming}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={confirmingLeave}
        title="Leave this room?"
        dismissible
        onClose={() => setConfirmingLeave(false)}
        footer={
          <>
            <Button variant="outlined" onClick={() => setConfirmingLeave(false)}>
              Stay
            </Button>
            <Button
              danger
              loading={leaving}
              onClick={() => {
                setConfirmingLeave(false);
                onLeave?.();
              }}
            >
              Leave room
            </Button>
          </>
        }
      >
        Your vote in the current round goes with you. The room keeps the code, so you can come back
        to it — you will be asked for your name again.
      </Dialog>
    </>
  );
};

export default UserMenu;
