import './VoteCards.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';

interface VoteCardsProps {
  values: readonly number[];
  selected: number | null;
  disabled: boolean;
  /** Names the group for a reader who arrives at it without the heading above. */
  label: string;
  onSelect: (value: number) => void;
}

// Toggle buttons rather than a radio group, and deliberately: picking the card you already hold
// clears your vote, which is the only way back to "waiting" — and a radio, once chosen, cannot be
// un-chosen. `aria-pressed` says exactly that: each card is on or off, and pressing it again
// turns it off.
const VoteCards = ({
  values,
  selected,
  disabled,
  label,
  onSelect,
}: VoteCardsProps): ReactElement => {
  return (
    <div className="vote-cards" role="group" aria-label={label}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          className={clsx('vote-cards__card', selected === value && 'vote-cards__card--selected')}
          disabled={disabled}
          aria-pressed={selected === value}
          onClick={() => onSelect(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
};

export default VoteCards;
