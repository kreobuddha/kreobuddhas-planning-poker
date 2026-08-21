import './RoundStats.scss';
import type { ReactElement } from 'react';
import { UNSURE_CARD } from '@/config';
import type { IVote } from '@/types';

interface RoundStatsProps {
  votes: IVote[];
}

// What the revealed cards do not say on their own. Who voted what, and who did not, is on the
// seats around the table — repeating it here would be the same information twice, and two places
// that can disagree.
const RoundStats = ({ votes }: RoundStatsProps): ReactElement | null => {
  // "?" is a refusal to estimate, so it counts as a vote cast but never as a number: averaging
  // it in — or picking any stand-in number for it — would be inventing an estimate nobody gave.
  const numeric = votes.filter((v): v is IVote & { value: number } => v.value !== UNSURE_CARD);
  const values = numeric.map((v) => v.value);
  if (values.length === 0) return null;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  return (
    <p className="round-stats">
      Average: <strong>{average.toFixed(1)}</strong> person-days · Spread:{' '}
      <strong>{lowest === highest ? lowest : `${lowest}–${highest}`}</strong>
    </p>
  );
};

export default RoundStats;
