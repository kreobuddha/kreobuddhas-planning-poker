import './SessionDeadline.scss';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Button, Dialog } from '@kreobuddha/ui';
import { SESSION_EXPIRY_WARNING_MS } from '@/config';

interface SessionDeadlineProps {
  expiresAt: number;
  extending: boolean;
  closing: boolean;
  onExtend: () => void;
  onClose: () => void;
}

const minutesLeft = (expiresAt: number): number =>
  Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000));

// The one place in the app whose display has to move without a snapshot arriving: a deadline
// passes on its own, and nothing is written when it does.
const SessionDeadline = ({
  expiresAt,
  extending,
  closing,
  onExtend,
  onClose,
}: SessionDeadlineProps): ReactElement => {
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setRemaining(expiresAt - Date.now());
    const timer = setInterval(() => setRemaining(expiresAt - Date.now()), 10_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const warning = remaining <= SESSION_EXPIRY_WARNING_MS;

  return (
    <div className="session-deadline">
      {warning && (
        <Alert tone="warning" title="This room is about to close" live>
          Nobody will be able to vote in it after {minutesLeft(expiresAt)} min. Extending keeps it
          open, and everything in it stays where it is.
          <Button loading={extending} onClick={onExtend}>
            Extend
          </Button>
        </Alert>
      )}

      <Button variant="ghost" danger onClick={() => setConfirming(true)}>
        Close room
      </Button>

      <Dialog
        open={confirming}
        title="Close this room?"
        dismissible
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="outlined" onClick={() => setConfirming(false)}>
              Keep it open
            </Button>
            <Button
              danger
              loading={closing}
              onClick={() => {
                setConfirming(false);
                onClose();
              }}
            >
              Close room
            </Button>
          </>
        }
      >
        Voting stops immediately and cannot be resumed — a closed room is an expired one. The
        questions and the votes already cast stay readable.
      </Dialog>
    </div>
  );
};

export default SessionDeadline;
