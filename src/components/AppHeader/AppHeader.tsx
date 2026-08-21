import './AppHeader.scss';
import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';

interface AppHeaderProps {
  /**
   * Whatever the screen below puts in the bar — in a room, that is every control the room has.
   * A slot rather than props: the header would otherwise need the deck, the participant list and
   * a handler for each, which is a pipe, not a header.
   */
  children?: ReactNode;
}

// Rendered by each screen rather than once above the router. The bar is the only chrome the app
// has, so the room's controls belong in it — and route-sniffing to decide what to draw would mean
// this component knowing about every screen instead of each screen speaking for itself.
const AppHeader = ({ children }: AppHeaderProps): ReactElement => {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        Planning Poker
      </Link>
      <div className="app-header__actions">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
};

export default AppHeader;
