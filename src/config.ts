// Sessions store the deck *key*, not its values, so adjusting a scale here doesn't require
// touching existing session documents.
export const CARD_DECKS = {
  fibonacci: { label: 'Fibonacci', values: [1, 2, 3, 5, 8, 13, 21] },
  modified: { label: 'Modified Fibonacci', values: [0.5, 1, 2, 3, 5, 8, 13, 20] },
  powers: { label: 'Powers of two', values: [1, 2, 4, 8, 16, 32] },
} as const;

export type DeckKey = keyof typeof CARD_DECKS;

export const DEFAULT_DECK: DeckKey = 'modified';
