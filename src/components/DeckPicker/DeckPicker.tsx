import type { ReactElement } from 'react';
import { FieldGroup, Radio } from '@kreobuddha/ui';
import { CARD_DECKS } from '@/config';
import type { DeckKey } from '@/config';

interface DeckPickerProps {
  value: DeckKey;
  disabled: boolean;
  onChange: (deck: DeckKey) => void;
}

// No stylesheet of its own, like CopyLinkButton: the options, their labels, the chosen state and
// the group's question all come from FieldGroup and Radio, and the dialog around it owns the
// spacing. There is nothing left for a wrapper to say.
const DeckPicker = ({ value, disabled, onChange }: DeckPickerProps): ReactElement => {
  const keys = Object.keys(CARD_DECKS) as DeckKey[];

  return (
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
  );
};

export default DeckPicker;
