import './Results.scss';
import type { ReactElement } from 'react';
import type { IParticipant, IVote } from '@/types';

interface ResultsProps {
  votes: IVote[];
  participants: IParticipant[];
}

const Results = ({ votes, participants }: ResultsProps): ReactElement => {
  const nameFor = (participantId: string): string =>
    participants.find((p) => p.id === participantId)?.name ?? 'Unknown';

  const average = votes.length > 0 ? votes.reduce((sum, v) => sum + v.value, 0) / votes.length : 0;

  return (
    <div className="results">
      <div className="results__grid">
        {votes.map((v) => (
          <div key={v.id} className="results__card">
            <div className="results__value">{v.value}</div>
            <div className="results__name">{nameFor(v.id)}</div>
          </div>
        ))}
      </div>
      {votes.length > 0 && (
        <p className="results__average">
          Average: <strong>{average.toFixed(1)}</strong> person-days
        </p>
      )}
    </div>
  );
};

export default Results;
