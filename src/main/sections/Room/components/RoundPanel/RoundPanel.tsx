import './RoundPanel.scss';
import type { ReactElement } from 'react';
import { Button } from '@kreobuddha/ui';
import VoteCards from '@/components/VoteCards/VoteCards';
import Results from '@/components/Results/Results';
import type { CardValue } from '@/config';
import type { IParticipant, IRound, IVote } from '@/types';

interface RoundPanelProps {
  round: IRound;
  deckValues: readonly number[];
  votes: IVote[];
  participants: IParticipant[];
  myVote: CardValue | null;
  isAdmin: boolean;
  voting: boolean;
  revealing: boolean;
  reopening: boolean;
  onSelect: (value: CardValue) => void;
  onReveal: () => void;
  onReopen: () => void;
}

const RoundPanel = ({
  round,
  deckValues,
  votes,
  participants,
  myVote,
  isAdmin,
  voting,
  revealing,
  reopening,
  onSelect,
  onReveal,
  onReopen,
}: RoundPanelProps): ReactElement => {
  return (
    <div className="round-panel">
      <h2 className="round-panel__question">{round.question}</h2>

      {round.revealed ? (
        <>
          <Results votes={votes} participants={participants} />
          {isAdmin && (
            <Button variant="outlined" loading={reopening} onClick={onReopen}>
              Reopen round
            </Button>
          )}
        </>
      ) : (
        <>
          <VoteCards
            values={deckValues}
            selected={myVote}
            disabled={voting}
            onSelect={onSelect}
            label={`Your estimate for: ${round.question}`}
          />
          {isAdmin && (
            <Button loading={revealing} onClick={onReveal}>
              Reveal cards
            </Button>
          )}
        </>
      )}

      {/* The one thing in this room that changes under the reader without them doing anything:
          somebody else reveals, or the admin reopens. Announced rather than left to be noticed. */}
      <p className="visually-hidden" aria-live="polite">
        {round.revealed
          ? `Votes revealed for: ${round.question}`
          : `Voting is open for: ${round.question}`}
      </p>
    </div>
  );
};

export default RoundPanel;
