import './RoundHistory.scss';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Accordion, Button } from '@kreobuddha/ui';
import { ROUND_HISTORY_PAGE_SIZE } from '@/config';
import type { IRound } from '@/types';
import RoundHistoryItem from '@/main/sections/Room/components/RoundHistoryItem/RoundHistoryItem';

interface RoundHistoryProps {
  sessionId: string;
  rounds: IRound[];
}

const RoundHistory = ({ sessionId, rounds }: RoundHistoryProps): ReactElement | null => {
  const [visible, setVisible] = useState(ROUND_HISTORY_PAGE_SIZE);

  if (rounds.length === 0) return null;

  const shown = rounds.slice(0, visible);
  const remaining = rounds.length - shown.length;

  return (
    <Accordion
      className="round-history"
      items={[
        {
          id: 'round-history',
          // The full count, not the number drawn: the label is how a room says how long the
          // meeting has been, and paging is about what is fetched, not about what is true.
          label: `Previous questions (${rounds.length})`,
          content: (
            <>
              <ol className="round-history__list">
                {shown.map((round) => (
                  <RoundHistoryItem key={round.id} sessionId={sessionId} round={round} />
                ))}
              </ol>
              {remaining > 0 && (
                <Button
                  className="round-history__more"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisible((current) => current + ROUND_HISTORY_PAGE_SIZE)}
                >
                  Show {Math.min(remaining, ROUND_HISTORY_PAGE_SIZE)} more
                </Button>
              )}
            </>
          ),
        },
      ]}
    />
  );
};

export default RoundHistory;
