import './AppHeader.scss';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';

const AppHeader = (): ReactElement => {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        Planning Poker
      </Link>
      <ThemeToggle />
    </header>
  );
};

export default AppHeader;
