import './RoundHistoryDrawer.scss';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Button, IconButton } from '@kreobuddha/ui';
import RoundHistory from '@/main/sections/Room/components/RoundHistory/RoundHistory';
import type { IRound } from '@/types';

interface RoundHistoryDrawerProps {
  sessionId: string;
  /** Every round but the one being played. */
  rounds: IRound[];
}

const CloseIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// The panel's content is mounted only while it is open, and that is the whole point rather than an
// optimisation: every history row reads its own round's votes collection when it mounts, so a
// panel that kept its rows alive behind a closed edge would charge a room with fifty questions
// fifty reads per person for something nobody had asked to see.
const RoundHistoryDrawer = ({
  sessionId,
  rounds,
}: RoundHistoryDrawerProps): ReactElement | null => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const close = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  // Nothing behind the room yet: the first question is still the current one.
  if (rounds.length === 0) return null;

  return (
    <>
      {/* No `aria-controls`: while the drawer is closed there is no panel to point at, which is
          exactly the state this control describes. `aria-expanded` says it on its own. */}
      <Button
        className="round-history-drawer__handle"
        variant="outlined"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Previous questions ({rounds.length})
      </Button>

      {open && (
        <aside className="round-history-drawer" aria-label="Previous questions">
          <div className="round-history-drawer__head">
            <h2>Previous questions</h2>
            <IconButton
              label="Close"
              icon={<CloseIcon />}
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            />
          </div>

          <RoundHistory sessionId={sessionId} rounds={rounds} />
        </aside>
      )}
    </>
  );
};

export default RoundHistoryDrawer;
