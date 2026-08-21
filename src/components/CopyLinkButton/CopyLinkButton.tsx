import type { ReactElement } from 'react';
import { IconButton, Tooltip, useToast } from '@kreobuddha/ui';

const LinkIcon = (): ReactElement => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"
    />
  </svg>
);

const CopyLinkButton = (): ReactElement => {
  const { toast } = useToast();
  const label = 'Copy room link';

  // Clipboard writes are refused outside a secure context and in browsers where the permission
  // is denied, so the failure is real and needs to show rather than reject silently.
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ tone: 'success', children: 'Room link copied.' });
    } catch {
      toast({ tone: 'danger', children: 'Could not copy the room link.' });
    }
  };

  return (
    // Below the button for the same reason as the theme toggle beside it: this is the topmost row
    // of the page, and a tooltip preferring the top would cover the control it describes.
    <Tooltip content={label} placement="bottom">
      <IconButton
        label={label}
        // IconButton falls back to `label` as the native `title`, which would show a second,
        // browser-drawn tooltip next to this one.
        title=""
        icon={<LinkIcon />}
        variant="ghost"
        size="sm"
        onClick={handleCopy}
      />
    </Tooltip>
  );
};

export default CopyLinkButton;
