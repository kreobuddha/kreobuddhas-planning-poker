import './RoomHeader.scss';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { Button, Dialog, TextField } from '@kreobuddha/ui';
import { NAME_MAX_LENGTH } from '@/config';
import CopyLinkButton from '@/components/CopyLinkButton/CopyLinkButton';

interface RoomHeaderProps {
  code: string;
  /** The current participant's name, or null before they have joined. */
  youAre: string | null;
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

const RoomHeader = ({
  code,
  youAre,
  renaming,
  leaving,
  onLeave,
  onRename,
}: RoomHeaderProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const submitName = (e: FormEvent): void => {
    e.preventDefault();
    const next = draft?.trim() ?? '';
    if (next.length > 0 && next !== youAre) onRename(next);
    setDraft(null);
  };

  return (
    <header className="room-header">
      <div className="room-header__title-row">
        <h1>Session {code}</h1>
        <CopyLinkButton />
      </div>

      {/* A div rather than a paragraph: this line carries the rename form, and a `<form>` — or
          the `<div>` the TextField draws inside it — is not phrasing content, so a `<p>` around
          it is invalid. The browser closed the paragraph early and React logged the mismatch on
          every render of the room. Nothing here needs to be a paragraph; it is a line of header
          metadata, which is what the class has always called it. */}
      <div className="room-header__line">
        Share this code with your team to let them join.
        {youAre !== null &&
          (draft === null ? (
            <span className="room-header__you">
              You are {youAre}
              <Button size="sm" variant="ghost" onClick={() => setDraft(youAre)}>
                Rename
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
            </span>
          ) : (
            <form className="room-header__rename" onSubmit={submitName}>
              <TextField
                label="Your name"
                value={draft}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button type="submit" size="sm" loading={renaming}>
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </form>
          ))}
      </div>

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
    </header>
  );
};

export default RoomHeader;
