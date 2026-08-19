import './Results.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';
import { UNSURE_CARD } from '@/config';
import type { IParticipant, IVote } from '@/types';

interface ResultsProps {
  votes: IVote[];
  participants: IParticipant[];
}

const Results = ({ votes, participants }: ResultsProps): ReactElement => {
  const nameFor = (participantId: string): string =>
    participants.find((p) => p.id === participantId)?.name ?? 'Unknown';

  const votedIds = new Set(votes.map((v) => v.id));
  const silent = participants.filter((p) => !votedIds.has(p.id));

  // "?" is a refusal to estimate, so it counts as a vote cast but never as a number: averaging
  // it in — or picking any stand-in number for it — would be inventing an estimate nobody gave.
  const numeric = votes.filter((v): v is IVote & { value: number } => v.value !== UNSURE_CARD);
  const values = numeric.map((v) => v.value);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  return (
    <div className="results">
      <div className="results__grid">
        {votes.map((v) => (
          <div
            key={v.id}
            className={clsx('results__card', v.value === UNSURE_CARD && 'results__card--aside')}
          >
            <div className="results__value">{v.value}</div>
            <div className="results__name">{nameFor(v.id)}</div>
            {v.value === UNSURE_CARD && <div className="results__note">not counted</div>}
          </div>
        ))}
        {/* A missing vote is a result too: without it the room cannot tell an absent estimate
            from an estimate that happens to agree with everyone else's. */}
        {silent.map((p) => (
          <div key={p.id} className="results__card results__card--aside">
            <div className="results__value" aria-hidden="true">
              —
            </div>
            <div className="results__name">{p.name}</div>
            <div className="results__note">did not vote</div>
          </div>
        ))}
      </div>
      {values.length > 0 && (
        <p className="results__stats">
          Average: <strong>{average.toFixed(1)}</strong> person-days · Spread:{' '}
          <strong>{lowest === highest ? lowest : `${lowest}–${highest}`}</strong>
        </p>
      )}
    </div>
  );
};

export default Results;
