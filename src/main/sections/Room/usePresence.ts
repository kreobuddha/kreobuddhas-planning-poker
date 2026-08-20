import { useEffect } from 'react';
import { PRESENCE_HEARTBEAT_MS } from '@/config';
import { useTouchPresenceMutation } from '@/main/sections/Room/endpoints/roomApi';

interface PresenceArgs {
  sessionId: string | null;
  userId: string;
  /** False before the reader is in the participant list, and once the room has closed. */
  active: boolean;
}

// Says "still here" while the tab is visible, and stops the moment it is not. Stopping is the
// whole point: a hidden tab is somebody who walked away, and a beat that carried on regardless
// would keep every abandoned tab in the room forever — which is the state this replaces.
//
// A tab coming back beats immediately rather than waiting out the interval, so returning to the
// room is instant while leaving it takes PRESENCE_TIMEOUT_MS to notice. That asymmetry is
// deliberate: being wrongly marked away is a worse failure than being marked present a minute
// too long.
export const usePresence = ({ sessionId, userId, active }: PresenceArgs): void => {
  const [touchPresence] = useTouchPresenceMutation();

  useEffect(() => {
    if (sessionId === null || !active) return;

    // A refused beat is not worth a toast: the room is readable, the reader can still see and do
    // everything, and the only consequence is that others stop counting on them.
    const beat = (): void => {
      void touchPresence({ sessionId, userId });
    };

    const beatIfVisible = (): void => {
      if (document.hidden) return;
      beat();
    };

    // The first one is unconditional. Opening a room in a background tab is still opening it,
    // and a tab that never beat at all would leave a row the room cannot date — indistinguishable
    // from one written before presence existed, and so counted as present forever.
    beat();
    const timer = setInterval(beatIfVisible, PRESENCE_HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beatIfVisible);

    return (): void => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', beatIfVisible);
    };
  }, [sessionId, userId, active, touchPresence]);
};
