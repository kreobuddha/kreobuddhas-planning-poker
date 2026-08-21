import './PokerTable.scss';
import type { ReactElement, ReactNode } from 'react';
import { Skeleton } from '@kreobuddha/ui';
import ParticipantSeat from '@/main/sections/Room/components/ParticipantSeat/ParticipantSeat';
import type { SeatPhase } from '@/main/sections/Room/components/ParticipantSeat/ParticipantSeat';
import RoundStats from '@/main/sections/Room/components/RoundStats/RoundStats';
import type { CardValue } from '@/config';
import type { IParticipant, IRound, IVote } from '@/types';

interface PokerTableProps {
  participants: IParticipant[];
  votes: IVote[];
  presentIds: Set<string>;
  round: IRound | null;
  adminId: string;
  /** The reader's own uid. Their seat is always the one at the near edge. */
  youId: string;
  /** The deck the room is playing with — the scale the confidence reading is measured on. */
  deckValues: readonly number[];
  loading: boolean;
  /** What the round is asking of the reader right now — the ask form, or the admin's controls. */
  children?: ReactNode;
}

// How many people sit across the table before the rest take the sides. A number rather than a
// measurement: the seats are grid areas, so the split has to be decided before anything is laid
// out and cannot be read back off the result.
const SEATS_ACROSS = 6;

const PokerTable = ({
  participants,
  votes,
  presentIds,
  round,
  adminId,
  youId,
  deckValues,
  loading,
  children,
}: PokerTableProps): ReactElement => {
  const phase: SeatPhase = round === null ? 'idle' : round.revealed ? 'revealed' : 'voting';
  const voteFor = (participantId: string): CardValue | null =>
    votes.find((v) => v.id === participantId)?.value ?? null;

  // Sorted here rather than trusted: the reader has to keep the same neighbours between snapshots,
  // and where a row lands in a Firestore collection is not a promise about that.
  const others = [...participants]
    .filter((p) => p.id !== youId)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const overflow = others.slice(SEATS_ACROSS);

  const seatsOf = (people: IParticipant[]): ReactElement[] =>
    people.map((p) => (
      <ParticipantSeat
        key={p.id}
        participant={p}
        vote={voteFor(p.id)}
        present={presentIds.has(p.id)}
        phase={phase}
        isYou={p.id === youId}
        isAdmin={p.id === adminId}
      />
    ));

  const you = participants.filter((p) => p.id === youId);
  const votedPresentCount = votes.filter((v) => presentIds.has(v.id)).length;

  return (
    <div className="poker-table">
      {/* Nobody is ever "loaded and alone" here — the room only renders once the reader is in the
          list — so the placeholder stands for a list still arriving, not for an empty table. */}
      {loading ? (
        <ul className="poker-table__seats poker-table__seats--top" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="poker-table__pending">
              <Skeleton />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="poker-table__seats poker-table__seats--top">
            {seatsOf(others.slice(0, SEATS_ACROSS))}
          </ul>
          {/* The overflow alternates right, left, right… so a table that grows keeps its balance
              instead of filling one side to the floor before starting the other. */}
          <ul className="poker-table__seats poker-table__seats--left">
            {seatsOf(overflow.filter((_, i) => i % 2 === 1))}
          </ul>
          <ul className="poker-table__seats poker-table__seats--right">
            {seatsOf(overflow.filter((_, i) => i % 2 === 0))}
          </ul>
          <ul className="poker-table__seats poker-table__seats--bottom">{seatsOf(you)}</ul>
        </>
      )}

      <div className="poker-table__surface">
        <h2 className="poker-table__question">{round ? round.question : 'No question yet'}</h2>

        {/* Counted against the people the room is still expecting, not against every row ever
            written: a tally of "3 of 7" that can never reach 7 tells the admin to keep waiting for
            four people who closed their laptops. */}
        {round && !round.revealed && (
          <p className="poker-table__progress">
            Voted {votedPresentCount} of {presentIds.size}
          </p>
        )}

        {round?.revealed && <RoundStats votes={votes} deckValues={deckValues} />}

        {children}

        {/* The one thing in this room that changes under the reader without them doing anything:
            somebody else reveals, or the admin reopens. Announced rather than left to be noticed. */}
        {round && (
          <p className="visually-hidden" aria-live="polite">
            {round.revealed
              ? `Votes revealed for: ${round.question}`
              : `Voting is open for: ${round.question}`}
          </p>
        )}
      </div>
    </div>
  );
};

export default PokerTable;
