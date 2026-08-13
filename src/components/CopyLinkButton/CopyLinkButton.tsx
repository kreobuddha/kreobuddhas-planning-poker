import './CopyLinkButton.scss';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import clsx from 'clsx';

// Clipboard writes are refused outside a secure context and in browsers where the permission
// is denied, so the failure is real and needs to show rather than reject silently.
type CopyStatus = 'idle' | 'copied' | 'failed';

const LABELS: Record<CopyStatus, string> = {
  idle: 'Copy room link',
  copied: 'Copied!',
  failed: 'Copy failed',
};

const CopyLinkButton = (): ReactElement => {
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <button
      type="button"
      className={clsx('copy-link-button', status === 'failed' && 'copy-link-button--failed')}
      onClick={handleCopy}
    >
      {LABELS[status]}
    </button>
  );
};

export default CopyLinkButton;
