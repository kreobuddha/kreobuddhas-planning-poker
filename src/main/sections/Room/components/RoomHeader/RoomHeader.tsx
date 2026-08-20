import './RoomHeader.scss';
import type { ReactElement } from 'react';
import CopyLinkButton from '@/components/CopyLinkButton/CopyLinkButton';

interface RoomHeaderProps {
  code: string;
  /** The current participant's name, or null before they have joined. */
  youAre: string | null;
}

const RoomHeader = ({ code, youAre }: RoomHeaderProps): ReactElement => {
  return (
    <header className="room-header">
      <div className="room-header__title-row">
        <h1>Session {code}</h1>
        <CopyLinkButton />
      </div>
      <p>
        Share this code with your team to let them join.
        {youAre !== null && <span className="room-header__you">You are {youAre}</span>}
      </p>
    </header>
  );
};

export default RoomHeader;
