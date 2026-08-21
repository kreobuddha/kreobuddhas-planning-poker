import './RoomHeader.scss';
import type { ReactElement, ReactNode } from 'react';

interface RoomHeaderProps {
  code: string;
  /** The room's own controls — the settings dialog and the user menu. */
  children?: ReactNode;
}

// A slot rather than a dozen props. Everything the controls need to do belongs to the room, and
// handing the header the deck, the close handler, the rename handler and each of their in-flight
// flags would have made it a pipe rather than a header.
const RoomHeader = ({ code, children }: RoomHeaderProps): ReactElement => {
  return (
    <header className="room-header">
      <div className="room-header__title-row">
        <div>
          <h1>Session {code}</h1>
          <p className="room-header__line">Share this code with your team to let them join.</p>
        </div>
        <div className="room-header__actions">{children}</div>
      </div>
    </header>
  );
};

export default RoomHeader;
