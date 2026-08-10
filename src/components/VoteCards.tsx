import { CARD_VALUES } from '../types';

interface VoteCardsProps {
  selected: number | null;
  disabled: boolean;
  onSelect: (value: number) => void;
}

export default function VoteCards({ selected, disabled, onSelect }: VoteCardsProps) {
  return (
    <div className="vote-cards">
      {CARD_VALUES.map((value) => (
        <button
          key={value}
          className={`vote-card ${selected === value ? 'selected' : ''}`}
          disabled={disabled}
          onClick={() => onSelect(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
