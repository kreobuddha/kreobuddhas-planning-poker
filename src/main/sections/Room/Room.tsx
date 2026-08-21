import './Room.scss';
import type { ReactElement } from 'react';
import { Alert, Spinner } from '@kreobuddha/ui';
import { CARD_DECKS } from '@/config';
import { errorMessage } from '@/store/queryError';
import RoomHeader from '@/main/sections/Room/components/RoomHeader/RoomHeader';
import RoomSettings from '@/main/sections/Room/components/RoomSettings/RoomSettings';
import UserMenu from '@/main/sections/Room/components/UserMenu/UserMenu';
import RoomSidebar from '@/main/sections/Room/components/RoomSidebar/RoomSidebar';
import JoinForm from '@/main/sections/Room/components/JoinForm/JoinForm';
import AskQuestionForm from '@/main/sections/Room/components/AskQuestionForm/AskQuestionForm';
import RoundPanel from '@/main/sections/Room/components/RoundPanel/RoundPanel';
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
  // renders with a placeholder sidebar, an unreadable list says so, and only a list that loaded
  // and does not hold the reader means "you are not in this room yet". Offering the join form on
  // an unreadable list would invite people to join a room they are already in.
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

      <div className="room__body">
        <RoomSidebar
          participants={participants}
          votedIds={votedIds}
          presentIds={presentIds}
          revealed={round?.revealed ?? false}
          adminId={session.adminId}
          loading={participantsLoading}
          youId={userId}
          onMakeAdmin={isAdmin ? actions.handleMakeAdmin : undefined}
          handingOverId={actions.handingOverId}
          onRemove={isAdmin && votingOpen ? actions.handleRemove : undefined}
          removingId={actions.removingId}
          sessionId={session.id}
          pastRounds={rounds.slice(1)}
        />

        <main className="room__main">
          {isAdmin && session.expiresAt !== undefined && (
            <SessionDeadline
              expiresAt={session.expiresAt}
              extending={actions.extending}
              onExtend={actions.handleExtend}
            />
          )}

          {isAdmin && (!round || round.revealed) && (
            <AskQuestionForm
              question={actions.question}
              busy={actions.asking}
              onQuestionChange={actions.setQuestion}
              onSubmit={actions.handleAskQuestion}
            />
          )}

          {round && (
            <RoundPanel
              round={round}
              deckValues={CARD_DECKS[deck].values}
              votes={votes}
              participants={participants}
              presentIds={presentIds}
              myVote={myVote?.value ?? null}
              isAdmin={isAdmin}
              voting={actions.voting}
              revealing={actions.revealing}
              reopening={actions.reopening}
              onSelect={actions.handleVote}
              onReveal={actions.handleReveal}
              onReopen={actions.handleReopen}
            />
          )}

          {!round && !isAdmin && <p>Waiting for the admin to ask a question…</p>}
        </main>
      </div>
    </div>
  );
};

export default Room;
