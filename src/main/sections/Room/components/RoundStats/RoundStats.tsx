import './RoundStats.scss';
import type { ReactElement } from 'react';
import { Badge } from '@kreobuddha/ui';
import { UNSURE_CARD } from '@/config';
import type { IVote } from '@/types';
import { confidenceOf } from '@/main/sections/Room/confidence';

interface RoundStatsProps {
  votes: IVote[];
  /** The deck this round was played with — what the distance between cards is measured against. */
  deckValues: readonly number[];
}

// What the revealed cards do not say on their own. Who voted what, and who did not, is on the
// seats around the table — repeating it here would be the same information twice, and two places
// that can disagree.
const RoundStats = ({ votes, deckValues }: RoundStatsProps): ReactElement | null => {
  // "?" is a refusal to estimate, so it counts as a vote cast but never as a number: averaging
  // it in — or picking any stand-in number for it — would be inventing an estimate nobody gave.
  const numeric = votes.filter((v): v is IVote & { value: number } => v.value !== UNSURE_CARD);
  const values = numeric.map((v) => v.value);
  if (values.length === 0) return null;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const confidence = confidenceOf(values, deckValues);

  return (
    <div className="round-stats">
      <p className="round-stats__line">
        Average: <strong>{average.toFixed(1)}</strong> person-days · Spread:{' '}
        <strong>{lowest === highest ? lowest : `${lowest}–${highest}`}</strong>
      </p>

      {/* The label is the reading, the distance behind it is the evidence. Both, because a room
          told only "Needs discussion" has to take the verdict on trust, and told only "4 cards
          apart" has to work out what that means about this deck. */}
      {confidence && (
        <p className="round-stats__confidence">
          <Badge tone={confidence.level.tone}>{confidence.level.label}</Badge>
          {confidence.steps > 0 && (
            <span className="round-stats__steps">
              {confidence.steps === 1 ? '1 card apart' : `${confidence.steps} cards apart`}
            </span>
          )}
        </p>
      )}
    </div>
  );
};

export default RoundStats;
