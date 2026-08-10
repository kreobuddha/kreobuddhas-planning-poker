import type { Participant, Vote } from '../types';

interface ResultsProps {
  votes: Vote[];
  participants: Participant[];
}

export default function Results({ votes, participants }: ResultsProps) {
  const nameFor = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.name ?? 'Unknown';

  const average =
    votes.length > 0 ? votes.reduce((sum, v) => sum + v.value, 0) / votes.length : 0;

  return (
    <div className="results">
      <div className="results-grid">
        {votes.map((v) => (
          <div key={v.id} className="result-card">
            <div className="result-value">{v.value}</div>
            <div className="result-name">{nameFor(v.id)}</div>
          </div>
        ))}
      </div>
      {votes.length > 0 && (
        <p className="average">
          Average: <strong>{average.toFixed(1)}</strong> person-days
        </p>
      )}
    </div>
  );
}
