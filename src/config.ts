import type { BadgeTone } from '@kreobuddha/ui';

// Sessions store the deck *key*, not its values, so adjusting a scale here doesn't require
// touching existing session documents.
export const CARD_DECKS = {
  fibonacci: { label: 'Fibonacci', values: [1, 2, 3, 5, 8, 13, 21] },
  modified: { label: 'Modified Fibonacci', values: [0.5, 1, 2, 3, 5, 8, 13, 20] },
  powers: { label: 'Powers of two', values: [1, 2, 4, 8, 16, 32] },
} as const;

export type DeckKey = keyof typeof CARD_DECKS;

// How far apart a round landed, said in cards rather than in numbers. The decks are not linear:
// under Fibonacci, 13 and 21 are neighbours while 1 and 8 are four cards apart, so a numeric spread
// of 8 means near-agreement at the top of the deck and a real argument at the bottom. Counting the
// cards between the highest and the lowest vote asks the question the room actually cares about —
// how many times somebody would have to change their mind.
//
// Thresholds and wording live here beside the decks they are measured against. Nothing in
// firebase/firestore.rules mirrors them: this is a reading of the votes, not a constraint on them.
export const CONFIDENCE_LEVELS = [
  { upToSteps: 0, label: 'Full consensus', tone: 'success' },
  { upToSteps: 1, label: 'Confident', tone: 'success' },
  { upToSteps: 2, label: 'Some disagreement', tone: 'warning' },
] as const satisfies readonly ConfidenceThreshold[];

// Anything further apart than the last threshold above.
export const CONFIDENCE_BEYOND: ConfidenceLevel = {
  label: 'Needs discussion',
  tone: 'danger',
};

// One estimate is not agreement. The gap is zero because there is only one card on the table, and
// calling that "full consensus" would report a room that never happened.
export const CONFIDENCE_ALONE: ConfidenceLevel = {
  label: 'Only one voted',
  tone: 'neutral',
};

export interface ConfidenceLevel {
  label: string;
  tone: BadgeTone;
}

interface ConfidenceThreshold extends ConfidenceLevel {
  /** The widest gap, in cards, this level still describes. */
  upToSteps: number;
}

// Deliberately not a member of any deck's `values`: "?" is not an estimate but a refusal to
// give one, so it is drawn after the deck and left out of the statistics. Mirrored in
// firebase/firestore.rules, which cannot import this file.
export const UNSURE_CARD = '?';

export type CardValue = number | typeof UNSURE_CARD;

export const DEFAULT_DECK: DeckKey = 'modified';

// A session's `deck` is a plain string in Firestore, so it can name a deck this build no longer
// has — an older key, or a value written outside the app. Indexing CARD_DECKS with it directly
// would hand `undefined` to every read site and crash the room for everyone in it.
export const deckKeyOf = (deck: string | undefined): DeckKey =>
  deck !== undefined && deck in CARD_DECKS ? (deck as DeckKey) : DEFAULT_DECK;

// Mirrors the caps in firebase/firestore.rules — rules can't import this file, so both sides
// have to be edited together. Enforcing them in the field as well is not belt-and-braces: past
// the cap the write is simply denied, and a permission error is a poor way to learn that a name
// was one character too long.
export const NAME_MAX_LENGTH = 40;
export const QUESTION_MAX_LENGTH = 200;

// A room is a meeting, not a document: it stays writable for a working session and then stops,
// so an abandoned room can't be voted in a month later. The admin can push the deadline back
// while the room is still live.
//
// SESSION_MAX_EXTENSION_MS is the ceiling the rules enforce, and it is deliberately separate
// from SESSION_TTL_MS: a short lifetime in development needs no rule change, because the rules
// only cap how far ahead a deadline may be set, never how close.
export const SESSION_MAX_EXTENSION_MS = 6 * 60 * 60 * 1000;

export const SESSION_TTL_MS = import.meta.env.DEV ? 5 * 60 * 1000 : SESSION_MAX_EXTENSION_MS;

// Proportional to the lifetime, or the warning would never be reachable in development.
export const SESSION_EXPIRY_WARNING_MS = import.meta.env.DEV ? 60 * 1000 : 15 * 60 * 1000;

// A room should hold the people who are in it, not everyone who ever opened the link. A tab says
// so every PRESENCE_HEARTBEAT_MS while it is visible; three missed beats and the room stops
// counting on that person. Three rather than one so a hiccup in the network doesn't read as
// somebody leaving.
//
// Not mirrored in firebase/firestore.rules, and deliberately: presence decides what the room
// *shows*, never what it allows. Someone marked away can still vote the moment they come back,
// which is exactly what should happen.
export const PRESENCE_HEARTBEAT_MS = 20 * 1000;
export const PRESENCE_TIMEOUT_MS = 3 * PRESENCE_HEARTBEAT_MS;

// How many past questions the history draws before it asks to be asked for more. The number is
// not cosmetic: every row mounted reads that round's whole votes collection, so a room with fifty
// questions behind it would cost fifty collection reads the moment the drawer opened. The drawer
// mounts nothing while it is closed, which is what keeps that cost off everyone who never opens
// it; paging is what keeps it from landing all at once on everyone who does. Ten is what fits on
// a screen; the rest arrive when they are wanted.
export const ROUND_HISTORY_PAGE_SIZE = 10;

// A join code is exactly this long — `generateSessionCode` draws it and the field on Home accepts
// nothing longer. Not mirrored in firebase/firestore.rules, and it does not need to be: the code
// is the session's document id, so a code of the wrong length simply addresses a document that
// does not exist.
export const SESSION_CODE_LENGTH = 6;
