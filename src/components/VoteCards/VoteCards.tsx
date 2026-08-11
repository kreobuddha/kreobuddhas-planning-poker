import { CARD_VALUES } from '@/types';
import './VoteCards.scss';

interface VoteCardsProps {
  selected: number | null;
  disabled: boolean;
  onSelect: (value: number) => void;
}

const VoteCards = ({ selected, disabled, onSelect }: VoteCardsProps) => {
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
};

export default VoteCards;
