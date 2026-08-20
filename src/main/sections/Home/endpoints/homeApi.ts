import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { DEFAULT_DECK, SESSION_TTL_MS } from '@/config';
import { emptyApi } from '@/store/emptyApi';

export const homeApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    // The session and its admin's participant row go in one batch: a session that exists with
    // nobody in it is a dead room nobody can be added to afterwards. The code doubles as the
    // document id, so a `set` onto a code already in use is an update of someone else's
    // session and the rules reject it — that's how a collision surfaces instead of silently
    // dropping the second team into the first team's room.
    createSession: builder.mutation<void, { userId: string; code: string; name: string }>({
      query: ({ userId, code, name }) => ({
        method: 'BATCH',
        writes: [
          {
            url: `/sessions/${code}`,
            method: 'PUT',
            data: {
              code,
              adminId: userId,
              deck: DEFAULT_DECK,
              createdAt: serverTimestamp(),
              // A real timestamp rather than serverTimestamp(): the rules compare it against
              // request.time, and a pending sentinel has no value to compare.
              expiresAt: Timestamp.fromMillis(Date.now() + SESSION_TTL_MS),
            },
          },
          {
            url: `/sessions/${code}/participants/${userId}`,
            method: 'PUT',
            // Joining is itself a sign of presence, and writing the first beat here is what lets
            // a missing `lastSeenAt` mean "row from before presence existed" rather than
            // "joined and never seen" — the second would be a ghost the room counts on forever.
            data: { name, joinedAt: serverTimestamp(), lastSeenAt: Date.now() },
          },
        ],
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useCreateSessionMutation } = homeApi;
