// Sessions store the deck *key*, not its values, so adjusting a scale here doesn't require
// touching existing session documents.
export const CARD_DECKS = {
  fibonacci: { label: 'Fibonacci', values: [1, 2, 3, 5, 8, 13, 21] },
  modified: { label: 'Modified Fibonacci', values: [0.5, 1, 2, 3, 5, 8, 13, 20] },
  powers: { label: 'Powers of two', values: [1, 2, 4, 8, 16, 32] },
} as const;

export type DeckKey = keyof typeof CARD_DECKS;

export const DEFAULT_DECK: DeckKey = 'modified';

// A session's `deck` is a plain string in Firestore, so it can name a deck this build no longer
// has — an older key, or a value written outside the app. Indexing CARD_DECKS with it directly
// would hand `undefined` to every read site and crash the room for everyone in it.
export const deckKeyOf = (deck: string | undefined): DeckKey =>
  deck !== undefined && deck in CARD_DECKS ? (deck as DeckKey) : DEFAULT_DECK;
