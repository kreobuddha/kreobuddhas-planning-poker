import type { ReactElement } from 'react';
import { IconButton, Tooltip } from '@kreobuddha/ui';
import { useTheme } from '@/hooks/useTheme';

const SunIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path
      strokeLinecap="round"
      d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"
    />
  </svg>
);

const MoonIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

const ThemeToggle = (): ReactElement => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Tooltip content={label}>
      <IconButton
        label={label}
        // IconButton falls back to `label` as the native `title`, which would show a second,
        // browser-drawn tooltip next to this one.
        title=""
        icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
      />
    </Tooltip>
  );
};

export default ThemeToggle;
