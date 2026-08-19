import './VoteCards.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';
import { UNSURE_CARD } from '@/config';
import type { CardValue } from '@/config';

interface VoteCardsProps {
  values: readonly number[];
  selected: CardValue | null;
  disabled: boolean;
  /** Names the group for a reader who arrives at it without the heading above. */
  label: string;
  onSelect: (value: CardValue) => void;
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
  const cards: readonly CardValue[] = [...values, UNSURE_CARD];

  return (
    <div className="vote-cards" role="group" aria-label={label}>
      {cards.map((value) => (
        <button
          key={value}
          type="button"
          className={clsx(
            'vote-cards__card',
            value === UNSURE_CARD && 'vote-cards__card--unsure',
            selected === value && 'vote-cards__card--selected'
          )}
          disabled={disabled}
          aria-pressed={selected === value}
          // The glyph alone doesn't say what pressing it means, and it is the one card whose
          // effect on the result is different from every other.
          aria-label={value === UNSURE_CARD ? 'Not sure — no estimate' : undefined}
          onClick={() => onSelect(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
};

export default VoteCards;
