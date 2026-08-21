import './ParticipantSeat.scss';
import type { ReactElement } from 'react';
import clsx from 'clsx';
import { Badge } from '@kreobuddha/ui';
import { UNSURE_CARD } from '@/config';
import type { CardValue } from '@/config';
import type { IParticipant } from '@/types';

/**
 * What the table is doing, which is not the same as what this seat holds. `idle` is a room with no
 * question in it — there is nothing to have voted on, so a seat there is neither waiting nor late.
 */
export type SeatPhase = 'idle' | 'voting' | 'revealed';

interface ParticipantSeatProps {
  participant: IParticipant;
  /** The card this seat holds, or null while nothing has been played into it. */
  vote: CardValue | null;
  /** Whether the room is still counting on this person — their tab has beaten recently enough. */
  present: boolean;
  phase: SeatPhase;
  isYou: boolean;
  isAdmin: boolean;
}

// A seat says three things at a glance and one of them only to a screen reader. Before the reveal
// the card is face down or an empty slot — shape and weight, so a full table can be read from
// across the room without looking for icons; after it, the card carries the estimate.
const ParticipantSeat = ({
  participant,
  vote,
  present,
  phase,
  isYou,
  isAdmin,
}: ParticipantSeatProps): ReactElement => {
  const voted = vote !== null;
  const revealed = phase === 'revealed';
  // Silence has two meanings and the room can tell them apart: somebody present who chose not to
  // answer, and somebody whose tab stopped beating before the question was put. Reading the second
  // as the first would make an absence look like a refusal.
  const note = revealed
    ? voted
      ? vote === UNSURE_CARD
        ? 'not counted'
        : null
      : present
        ? 'did not vote'
        : 'was away'
    : present
      ? null
      : 'away';

  return (
    <li className={clsx('participant-seat', !present && 'participant-seat--away')}>
      <div
        className={clsx(
          'participant-seat__card',
          revealed && 'participant-seat__card--face',
          phase === 'voting' &&
            (voted ? 'participant-seat__card--back' : 'participant-seat__card--empty'),
          revealed && (!voted || vote === UNSURE_CARD) && 'participant-seat__card--aside'
        )}
      >
        {revealed && (
          // The em dash is shape, not information: what a missing vote means is in the note below,
          // and read out twice it would say the estimate was "dash".
          <span className="participant-seat__value" aria-hidden={voted ? undefined : true}>
            {voted ? vote : '—'}
          </span>
        )}
      </div>

      <span className="participant-seat__who">{participant.name}</span>

      {/* A line of their own rather than trailing the name. Sharing a line, they wrapped or not
          depending on how long the name happened to be, so two seats side by side disagreed about
          where the badges live. */}
      {(isYou || isAdmin) && (
        <span className="participant-seat__badges">
          {isYou && <Badge>you</Badge>}
          {isAdmin && <Badge tone="accent">admin</Badge>}
        </span>
      )}

      {note !== null && <span className="participant-seat__note">{note}</span>}

      {/* While the round is open the card's own state is the only thing saying whether this person
          has played, and a face-down card has nothing to read. */}
      {phase === 'voting' && <span className="visually-hidden">{voted ? 'voted' : 'waiting'}</span>}
    </li>
  );
};

export default ParticipantSeat;
