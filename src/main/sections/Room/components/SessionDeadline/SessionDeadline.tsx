import './SessionDeadline.scss';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Button } from '@kreobuddha/ui';
import { SESSION_EXPIRY_WARNING_MS } from '@/config';

interface SessionDeadlineProps {
  expiresAt: number;
  extending: boolean;
  onExtend: () => void;
}

const minutesLeft = (expiresAt: number): number =>
  Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000));

// The one place in the app whose display has to move without a snapshot arriving: a deadline
// passes on its own, and nothing is written when it does.
//
// Closing the room used to live here too and now sits in the settings dialog. The warning cannot
// follow it: it is the room saying it is about to stop, and a warning nobody can see until they
// open a dialog is not a warning.
const SessionDeadline = ({
  expiresAt,
  extending,
  onExtend,
}: SessionDeadlineProps): ReactElement | null => {
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now());

  useEffect(() => {
    setRemaining(expiresAt - Date.now());
    const timer = setInterval(() => setRemaining(expiresAt - Date.now()), 10_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (remaining > SESSION_EXPIRY_WARNING_MS) return null;

  return (
    <div className="session-deadline">
      <Alert tone="warning" title="This room is about to close" live>
        Nobody will be able to vote in it after {minutesLeft(expiresAt)} min. Extending keeps it
        open, and everything in it stays where it is.
        <Button loading={extending} onClick={onExtend}>
          Extend
        </Button>
      </Alert>
    </div>
  );
};

export default SessionDeadline;
