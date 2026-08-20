import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy as orderByField,
  query as buildQuery,
  setDoc,
  updateDoc,
  where as whereClause,
  writeBatch,
} from 'firebase/firestore';
import type {
  DocumentData,
  DocumentSnapshot,
  Query,
  QueryConstraint,
  QuerySnapshot,
  WhereFilterOp,
} from 'firebase/firestore';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { db } from '@/lib/firebase';
import { withMillis } from '@/lib/firestoreDoc';
import { queryError, toQueryError } from '@/store/queryError';

export interface ReadWriteArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: DocumentData;
  params?: {
    where?: [string, WhereFilterOp, unknown][];
    orderBy?: [string, 'asc' | 'desc'][];
    limit?: number;
  };
  // Turns a GET that found nothing into an error carrying this message, instead of a `null` the
  // caller has to interpret. `findSessionByCode` is what this exists for: a bad code has to
  // reach the UI as "no such room", not as an empty read.
  notFound?: string;
}

interface BatchArgs {
  method: 'BATCH';
  // `data` is absent for a DELETE and required by the other two, which is what the union says.
  writes: (
    { url: string; method: 'PUT' | 'PATCH'; data: DocumentData } | { url: string; method: 'DELETE' }
  )[];
}

export type FirebaseQueryArgs = ReadWriteArgs | BatchArgs;

const segmentsOf = (url: string): string[] => url.split('/').filter(Boolean);

// Firestore path arity: odd segment count is a collection ('sessions', 'sessions/x/rounds'),
// even is a document ('sessions/x', 'sessions/x/rounds/y').
export const isCollection = (url: string): boolean => segmentsOf(url).length % 2 === 1;

const docRef = (url: string) => doc(db, ...(segmentsOf(url) as [string, ...string[]]));

const collectionRef = (url: string) =>
  collection(db, ...(segmentsOf(url) as [string, ...string[]]));

export const resolveRef = (args: ReadWriteArgs): Query | ReturnType<typeof docRef> => {
  if (!isCollection(args.url)) return docRef(args.url);

  const { where = [], orderBy = [], limit } = args.params ?? {};
  const constraints: QueryConstraint[] = [
    ...where.map(([field, op, value]) => whereClause(field, op, value)),
    ...orderBy.map(([field, direction]) => orderByField(field, direction)),
    ...(limit === undefined ? [] : [limitTo(limit)]),
  ];

  return buildQuery(collectionRef(args.url), ...constraints);
};

const toEntity = (snap: { id: string; data: () => DocumentData | undefined }): DocumentData => ({
  id: snap.id,
  ...withMillis((snap.data() ?? {}) as Record<string, unknown>),
});

// Shared so the initial fetch and the live stream reduce a snapshot identically — the two would
// otherwise be free to disagree about the shape of the same read.
export const snapshotData = (snap: QuerySnapshot | DocumentSnapshot): unknown =>
  'docs' in snap ? snap.docs.map(toEntity) : snap.exists() ? toEntity(snap) : null;

const firebaseBaseQuery =
  (): BaseQueryFn<FirebaseQueryArgs, unknown, FetchBaseQueryError> => async (args) => {
    try {
      if (args.method === 'BATCH') {
        const batch = writeBatch(db);
        for (const write of args.writes) {
          if (write.method === 'PUT') batch.set(docRef(write.url), write.data);
          else if (write.method === 'PATCH') batch.update(docRef(write.url), write.data);
          else batch.delete(docRef(write.url));
        }
        await batch.commit();
        return { data: undefined };
      }

      switch (args.method ?? 'GET') {
        case 'POST': {
          const ref = await addDoc(collectionRef(args.url), args.data ?? {});
          return { data: { id: ref.id } };
        }
        case 'PUT':
          await setDoc(docRef(args.url), args.data ?? {});
          return { data: undefined };
        case 'PATCH':
          await updateDoc(docRef(args.url), args.data ?? {});
          return { data: undefined };
        case 'DELETE':
          await deleteDoc(docRef(args.url));
          return { data: undefined };
        default: {
          const ref = resolveRef(args);
          const snap = isCollection(args.url)
            ? await getDocs(ref as Query)
            : await getDoc(ref as ReturnType<typeof docRef>);
          const result = snapshotData(snap);
          if (args.notFound !== undefined && result === null) return queryError(args.notFound);
          return { data: result };
        }
      }
    } catch (e) {
      // A read that failed reports the failure, including on a subscribed endpoint: an empty
      // room and an unreadable one must not look alike to the UI. Recovery is the listener's
      // job — see the `upsert` note in firestoreStream, which repairs the entry from the first
      // snapshot that arrives.
      return toQueryError(e, 'Request failed.');
    }
  };

export default firebaseBaseQuery;
