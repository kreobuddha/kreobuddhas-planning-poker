import './RoomSidebar.scss';
import type { ReactElement } from 'react';
import { Skeleton } from '@kreobuddha/ui';
import ParticipantList from '@/components/ParticipantList/ParticipantList';
import RoundHistory from '@/main/sections/Room/components/RoundHistory/RoundHistory';
import type { IParticipant, IRound } from '@/types';

interface RoomSidebarProps {
  participants: IParticipant[];
  votedIds: Set<string>;
  presentIds: Set<string>;
  revealed: boolean;
  adminId: string;
  loading: boolean;
  sessionId: string;
  pastRounds: IRound[];
  onMakeAdmin?: (userId: string) => void;
  handingOver: boolean;
  onRemove?: (userId: string) => void;
  removing: boolean;
}

const RoomSidebar = ({
  participants,
  votedIds,
  presentIds,
  revealed,
  adminId,
  loading,
  sessionId,
  pastRounds,
  onMakeAdmin,
  handingOver,
  onRemove,
  removing,
}: RoomSidebarProps): ReactElement => {
  return (
    <aside className="room-sidebar">
      <h2>Participants</h2>
      {/* There is no empty state below, and there cannot be: the room only renders once the
          reader is in the list, so "loaded and nobody here" is unreachable. What is reachable is
          the room rendering while the list is still arriving. */}
      {loading ? (
        <div className="room-sidebar__placeholder" aria-hidden="true">
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <ParticipantList
          participants={participants}
          votedIds={votedIds}
          presentIds={presentIds}
          revealed={revealed}
          adminId={adminId}
          onMakeAdmin={onMakeAdmin}
          handingOver={handingOver}
          onRemove={onRemove}
          removing={removing}
        />
      )}

      <RoundHistory sessionId={sessionId} rounds={pastRounds} />
    </aside>
  );
};

export default RoomSidebar;
