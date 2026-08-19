import './RoundHistory.scss';
import type { ReactElement } from 'react';
import { Accordion } from '@kreobuddha/ui';
import type { IRound } from '@/types';
import RoundHistoryItem from '@/main/sections/Room/components/RoundHistoryItem/RoundHistoryItem';

interface RoundHistoryProps {
  sessionId: string;
  rounds: IRound[];
}

const RoundHistory = ({ sessionId, rounds }: RoundHistoryProps): ReactElement | null => {
  if (rounds.length === 0) return null;

  return (
    <Accordion
      className="round-history"
      items={[
        {
          id: 'round-history',
          label: `Previous questions (${rounds.length})`,
          content: (
            <ol className="round-history__list">
              {rounds.map((round) => (
                <RoundHistoryItem key={round.id} sessionId={sessionId} round={round} />
              ))}
            </ol>
          ),
        },
      ]}
    />
  );
};

export default RoundHistory;
