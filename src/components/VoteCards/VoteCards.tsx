import './VoteCards.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';

interface VoteCardsProps {
  values: readonly number[];
  selected: number | null;
  disabled: boolean;
  onSelect: (value: number) => void;
}

const VoteCards = ({ values, selected, disabled, onSelect }: VoteCardsProps): ReactElement => {
  return (
    <div className="vote-cards">
      {values.map((value) => (
        <button
          key={value}
          className={clsx('vote-cards__card', selected === value && 'vote-cards__card--selected')}
          disabled={disabled}
          onClick={() => onSelect(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
};

export default VoteCards;
