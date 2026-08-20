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
  presentIds: Set<string>;
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
  presentIds,
  myVote,
  isAdmin,
  voting,
  revealing,
  reopening,
  onSelect,
  onReveal,
  onReopen,
}: RoundPanelProps): ReactElement => {
  const votedPresentCount = votes.filter((v) => presentIds.has(v.id)).length;

  return (
    <div className="round-panel">
      <h2 className="round-panel__question">{round.question}</h2>

      {/* Counted against the people the room is still expecting, not against every row ever
          written: a tally of "3 of 7" that can never reach 7 tells the admin to keep waiting for
          four people who closed their laptops. */}
      {!round.revealed && (
        <p className="round-panel__progress">
          Voted {votedPresentCount} of {presentIds.size}
        </p>
      )}

      {round.revealed ? (
        <>
          <Results votes={votes} participants={participants} presentIds={presentIds} />
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
