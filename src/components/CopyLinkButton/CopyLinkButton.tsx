import type { ReactElement } from 'react';
import { Button, useToast } from '@kreobuddha/ui';

const CopyLinkButton = (): ReactElement => {
  const { toast } = useToast();

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
    <Button variant="outlined" size="sm" onClick={handleCopy}>
      Copy room link
    </Button>
  );
};

export default CopyLinkButton;
