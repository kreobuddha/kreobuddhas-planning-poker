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

// How a collection read is reduced before it reaches the cache. Ignored for document URLs,
// which are inherently single.
export type Select = 'array' | 'first';

export interface ReadWriteArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: DocumentData;
  params?: {
    where?: [string, WhereFilterOp, unknown][];
    orderBy?: [string, 'asc' | 'desc'][];
    limit?: number;
  };
  select?: Select;
  // A collection GET that must yield exactly one document, e.g. lookup by unique code.
  single?: boolean;
  // Turns a GET that found nothing — a missing document, or an empty `single` query — into an
  // error carrying this message, instead of a `null` the caller has to interpret.
  notFound?: string;
}

interface BatchArgs {
  method: 'BATCH';
  writes: { url: string; method: 'PUT' | 'PATCH'; data: DocumentData }[];
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

// `single` implies 'first'. Shared so the initial fetch and the live stream reduce a snapshot
// identically — otherwise a `single` subscribed endpoint would fetch one object and then
// stream an array over it.
export const effectiveSelect = (args: ReadWriteArgs): Select =>
  args.select ?? (args.single ? 'first' : 'array');

export const applySelect = (
  snap: QuerySnapshot | DocumentSnapshot,
  select: Select = 'array'
): unknown => {
  if (!('docs' in snap)) return snap.exists() ? toEntity(snap) : null;
  if (select === 'first') return snap.docs[0] ? toEntity(snap.docs[0]) : null;
  return snap.docs.map(toEntity);
};

const firebaseBaseQuery =
  (): BaseQueryFn<FirebaseQueryArgs, unknown, FetchBaseQueryError> => async (args) => {
    try {
      if (args.method === 'BATCH') {
        const batch = writeBatch(db);
        for (const write of args.writes) {
          if (write.method === 'PUT') batch.set(docRef(write.url), write.data);
          else batch.update(docRef(write.url), write.data);
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
          const result = applySelect(snap, effectiveSelect(args));
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
