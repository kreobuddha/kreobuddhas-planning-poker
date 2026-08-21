import './AppHeader.scss';
import type { ReactElement } from 'react';
import { Link, useMatch } from 'react-router-dom';
import CopyLinkButton from '@/components/CopyLinkButton/CopyLinkButton';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';

const AppHeader = (): ReactElement => {
  // The copy button belongs to the room, but it needs nothing from it — the link it copies is the
  // address bar. Matching the route is therefore enough to place it here, next to the theme
  // toggle, without threading room state up through the header.
  const inRoom = useMatch('/room/:code') !== null;

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        Planning Poker
      </Link>
      <div className="app-header__actions">
        {inRoom && <CopyLinkButton />}
        <ThemeToggle />
      </div>
    </header>
  );
};

export default AppHeader;
