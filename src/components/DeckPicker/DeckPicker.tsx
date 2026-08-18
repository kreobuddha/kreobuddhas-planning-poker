import './DeckPicker.scss';
import type { ReactElement } from 'react';
import { FieldGroup, Radio } from '@kreobuddha/ui';
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
      <FieldGroup
        legend="Card deck"
        orientation="horizontal"
        hint={disabled ? 'Finish the current round to change the deck.' : undefined}
        disabled={disabled}
      >
        {keys.map((key) => (
          <Radio
            key={key}
            name="deck"
            value={key}
            label={CARD_DECKS[key].label}
            hint={CARD_DECKS[key].values.join(' · ')}
            checked={value === key}
            onChange={() => onChange(key)}
          />
        ))}
      </FieldGroup>
    </div>
  );
};

export default DeckPicker;
