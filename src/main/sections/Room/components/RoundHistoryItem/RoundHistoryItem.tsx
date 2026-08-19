import './RoundHistoryItem.scss';
import type { ReactElement } from 'react';
import { Badge } from '@kreobuddha/ui';
import type { IRound } from '@/types';
import { useFetchRoundVotesQuery } from '@/main/sections/Room/endpoints/roomApi';

interface RoundHistoryItemProps {
  sessionId: string;
  round: IRound;
}

const RoundHistoryItem = ({ sessionId, round }: RoundHistoryItemProps): ReactElement => {
  const { data: votes = [] } = useFetchRoundVotesQuery({ sessionId, roundId: round.id });

  const scores = votes.map((v) => v.value).filter((value) => typeof value === 'number');
  const average =
    scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;

  return (
    <li className="round-history-item">
      <span className="round-history-item__question">{round.question}</span>
      {average === null ? (
        <Badge tone="neutral">no votes</Badge>
      ) : (
        <Badge tone="accent">{average.toFixed(1)}</Badge>
      )}
    </li>
  );
};

export default RoundHistoryItem;
