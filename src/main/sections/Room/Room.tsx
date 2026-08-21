import './Room.scss';
import type { ReactElement } from 'react';
import { Alert, Button, Spinner } from '@kreobuddha/ui';
import { CARD_DECKS } from '@/config';
import { errorMessage } from '@/store/queryError';
import VoteCards from '@/components/VoteCards/VoteCards';
import RoomHeader from '@/main/sections/Room/components/RoomHeader/RoomHeader';
import RoomSettings from '@/main/sections/Room/components/RoomSettings/RoomSettings';
import RoomPeople from '@/main/sections/Room/components/RoomPeople/RoomPeople';
import UserMenu from '@/main/sections/Room/components/UserMenu/UserMenu';
import JoinForm from '@/main/sections/Room/components/JoinForm/JoinForm';
import AskQuestionForm from '@/main/sections/Room/components/AskQuestionForm/AskQuestionForm';
import AskQuestionDialog from '@/main/sections/Room/components/AskQuestionDialog/AskQuestionDialog';
import PokerTable from '@/main/sections/Room/components/PokerTable/PokerTable';
import RoundHistory from '@/main/sections/Room/components/RoundHistory/RoundHistory';
import SessionDeadline from '@/main/sections/Room/components/SessionDeadline/SessionDeadline';
import { useRoomActions } from '@/main/sections/Room/useRoomActions';
import { useRoomData } from '@/main/sections/Room/useRoomData';

interface RoomProps {
  userId: string;
}

const Room = ({ userId }: RoomProps): ReactElement => {
  const {
    session,
    sessionError,
    sessionLoading,
    participants,
    participantsLoading,
    participantsUnreadable,
    rounds,
    round,
    votes,
    me,
    isAdmin,
    presentIds,
    votedIds,
    myVote,
    deck,
    votingOpen,
  } = useRoomData(userId);

  const actions = useRoomActions({ userId, session, round, me, myVote, votingOpen });

  // Only a session that can't be loaded replaces the screen. A failed action is a toast, because
  // the session behind it is still live and usable.
  if (sessionError) {
    return (
      <div className="room__error">
        <Alert tone="danger" title="This room could not be opened">
          {errorMessage(sessionError, 'Session not found.')}
        </Alert>
      </div>
    );
  }
  if (sessionLoading || !session) {
    return (
      <div className="room__loading">
        <Spinner label="Loading session" />
      </div>
    );
  }

  // Three distinct states, and they must stay distinct: while the list is still arriving the room
  // renders with placeholder seats, an unreadable list says so, and only a list that loaded and
  // does not hold the reader means "you are not in this room yet". Offering the join form on an
  // unreadable list would invite people to join a room they are already in.
  if (participantsUnreadable) {
    return (
      <div className="room__error">
        <Alert tone="warning" title="Connection lost">
          Reconnecting… the room comes back on its own once the connection returns.
        </Alert>
      </div>
    );
  }

  if (!participantsLoading && !me) {
    return (
      <JoinForm
        code={session.code}
        name={actions.nameDraft}
        busy={actions.joining}
        onNameChange={actions.setNameDraft}
        onSubmit={actions.handleJoin}
      />
    );
  }

  return (
    <div className="room">
      <RoomHeader code={session.code}>
        {isAdmin && (
          <RoomSettings
            deck={deck}
            deckLocked={votingOpen || actions.settingDeck}
            closing={actions.closing}
            onDeckChange={actions.handleDeckChange}
            onCloseRoom={actions.handleCloseRoom}
          />
        )}
        {isAdmin && (
          <RoomPeople
            participants={participants}
            votedIds={votedIds}
            presentIds={presentIds}
            revealed={round?.revealed ?? false}
            adminId={session.adminId}
            youId={userId}
            onMakeAdmin={actions.handleMakeAdmin}
            handingOverId={actions.handingOverId}
            onRemove={votingOpen ? actions.handleRemove : undefined}
            removingId={actions.removingId}
          />
        )}
        {me && (
          <UserMenu
            name={me.name}
            renaming={actions.renaming}
            leaving={actions.removing}
            // An admin with somebody left to hand the room to has to hand it over first: the
            // rules only accept a new admin who is already a participant, so leaving first would
            // strand the room. The last person in a room may always leave — there is nobody to
            // strand.
            onLeave={isAdmin && participants.length > 1 ? undefined : actions.handleLeave}
            onRename={actions.handleRename}
          />
        )}
      </RoomHeader>

      {isAdmin && session.expiresAt !== undefined && (
        <SessionDeadline
          expiresAt={session.expiresAt}
          extending={actions.extending}
          onExtend={actions.handleExtend}
        />
      )}

      <PokerTable
        participants={participants}
        votes={votes}
        presentIds={presentIds}
        round={round}
        adminId={session.adminId}
        youId={userId}
        deckValues={CARD_DECKS[deck].values}
        loading={participantsLoading}
      >
        {!round && !isAdmin && <p className="room__waiting">Waiting for the admin…</p>}
        {!round && isAdmin && (
          <AskQuestionForm
            question={actions.question}
            busy={actions.asking}
            onQuestionChange={actions.setQuestion}
            onSubmit={actions.handleAskQuestion}
          />
        )}

        {/* One row of admin controls at the table's edge, rather than a control wherever the thing
            it acts on happens to be drawn. */}
        {round && isAdmin && (
          <div className="room__table-actions">
            {round.revealed ? (
              <>
                <Button
                  variant="outlined"
                  loading={actions.reopening}
                  onClick={actions.handleReopen}
                >
                  Reopen round
                </Button>
                <AskQuestionDialog
                  question={actions.question}
                  busy={actions.asking}
                  onQuestionChange={actions.setQuestion}
                  onSubmit={actions.handleAskQuestion}
                />
              </>
            ) : (
              <Button loading={actions.revealing} onClick={actions.handleReveal}>
                Reveal cards
              </Button>
            )}
          </div>
        )}
      </PokerTable>

      {/* The reader's hand: their own deck, below the table and outside it, because it is the one
          thing on this screen nobody else can touch. */}
      {round && !round.revealed && (
        <div className="room__hand">
          <VoteCards
            values={CARD_DECKS[deck].values}
            selected={myVote?.value ?? null}
            disabled={actions.voting}
            onSelect={actions.handleVote}
            label={`Your estimate for: ${round.question}`}
          />
        </div>
      )}

      <RoundHistory sessionId={session.id} rounds={rounds.slice(1)} />
    </div>
  );
};

export default Room;
