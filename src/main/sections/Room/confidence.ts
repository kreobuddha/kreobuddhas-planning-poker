import { CONFIDENCE_BEYOND, CONFIDENCE_LEVELS } from '@/config';
import type { ConfidenceLevel } from '@/config';

interface Confidence {
  /** How many cards apart the highest and the lowest estimate are. */
  steps: number;
  level: ConfidenceLevel;
}

/**
 * How far apart a round landed, measured in cards of the deck it was played with rather than in
 * the numbers on them. Returns null when there is nothing to measure.
 */
export const confidenceOf = (
  values: readonly number[],
  deckValues: readonly number[]
): Confidence | null => {
  // The deck belongs to the session, not to the round, so changing it re-labels every round already
  // played: a 21 voted under Fibonacci is not on the Powers of two scale at all. A card with no
  // position on the current scale has no distance to anything, so it is left out — counted as
  // position -1 it would report a disagreement nobody had.
  const positions = values.map((value) => deckValues.indexOf(value)).filter((i) => i !== -1);
  if (positions.length === 0) return null;

  const steps = Math.max(...positions) - Math.min(...positions);
  const level = CONFIDENCE_LEVELS.find((l) => steps <= l.upToSteps) ?? CONFIDENCE_BEYOND;

  return { steps, level };
};
