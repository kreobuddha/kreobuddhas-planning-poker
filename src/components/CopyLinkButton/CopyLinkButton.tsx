import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from '@kreobuddha/ui';

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
    <Button variant="outlined" size="sm" danger={status === 'failed'} onClick={handleCopy}>
      {LABELS[status]}
    </Button>
  );
};

export default CopyLinkButton;
