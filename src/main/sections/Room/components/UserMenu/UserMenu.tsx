import './UserMenu.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Button, Dialog, TextField, Toggletip } from '@kreobuddha/ui';
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
        <Button size="sm" variant="outlined">
          {name}
        </Button>
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
