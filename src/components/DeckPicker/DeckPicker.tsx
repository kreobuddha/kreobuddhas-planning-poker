import './DeckPicker.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';
import { CARD_DECKS } from '@/config';
import type { DeckKey } from '@/config';

interface DeckPickerProps {
  value: DeckKey;
  disabled: boolean;
  onChange: (deck: DeckKey) => void;
}

const DeckPicker = ({ value, disabled, onChange }: DeckPickerProps): ReactElement => {
  const keys = Object.keys(CARD_DECKS) as DeckKey[];

  return (
    <div className="deck-picker">
      <h2 className="deck-picker__title">Card deck</h2>
      <div className="deck-picker__options">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className={clsx(
              'deck-picker__option',
              value === key && 'deck-picker__option--selected'
            )}
            disabled={disabled}
            onClick={() => onChange(key)}
          >
            <span className="deck-picker__label">{CARD_DECKS[key].label}</span>
            <span className="deck-picker__values">{CARD_DECKS[key].values.join(' · ')}</span>
          </button>
        ))}
      </div>
      {disabled && (
        <p className="deck-picker__hint">Finish the current round to change the deck.</p>
      )}
    </div>
  );
};

export default DeckPicker;
