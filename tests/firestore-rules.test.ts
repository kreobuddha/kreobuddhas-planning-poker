import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// The rules are the only server-side boundary this app has, and they can't be exercised from
// the browser — a denied read is indistinguishable from an empty one there. Hence the one test
// suite in this project; see CLAUDE.md.

const CODE = 'ABC123';
const ADMIN = 'admin-uid';
const MEMBER = 'member-uid';
const OUTSIDER = 'outsider-uid';
const OPEN_ROUND = 'round-open';
const REVEALED_ROUND = 'round-revealed';

const sessionPath = `sessions/${CODE}`;
const votePath = (round: string, uid: string): string =>
  `${sessionPath}/rounds/${round}/votes/${uid}`;

let env: RulesTestEnvironment;

const asUser = (uid: string): Firestore => env.authenticatedContext(uid).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'planning-poker-rules-test',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  });

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, sessionPath), {
      code: CODE,
      adminId: ADMIN,
      deck: 'modified',
      createdAt: Date.now(),
    });
    await setDoc(doc(db, `${sessionPath}/participants/${MEMBER}`), {
      name: 'Member',
      joinedAt: Date.now(),
    });
    await setDoc(doc(db, `${sessionPath}/rounds/${OPEN_ROUND}`), {
      question: 'How long?',
      revealed: false,
      createdAt: Date.now(),
    });
    await setDoc(doc(db, `${sessionPath}/rounds/${REVEALED_ROUND}`), {
      question: 'Already done',
      revealed: true,
      createdAt: Date.now(),
    });
    await setDoc(doc(db, votePath(REVEALED_ROUND, MEMBER)), { value: 5, createdAt: Date.now() });
  });
});

after(async () => {
  await env.cleanup();
});

describe('sessions', () => {
  it('is readable by code but cannot be enumerated', async () => {
    const db = asUser(OUTSIDER);
    await assertSucceeds(getDoc(doc(db, sessionPath)));
    await assertFails(getDocs(collection(db, 'sessions')));
  });

  it('can only be created under its own code, by its own admin', async () => {
    const db = asUser(ADMIN);
    const valid = { code: 'NEWONE', adminId: ADMIN, deck: 'modified', createdAt: Date.now() };
    await assertSucceeds(setDoc(doc(db, 'sessions/NEWONE'), valid));
    await assertFails(setDoc(doc(db, 'sessions/OTHER1'), valid));
    await assertFails(
      setDoc(doc(db, 'sessions/OTHER2'), { ...valid, code: 'OTHER2', adminId: OUTSIDER })
    );
  });

  it('lets the admin change only the deck, and only to a known one', async () => {
    await assertSucceeds(updateDoc(doc(asUser(ADMIN), sessionPath), { deck: 'powers' }));
    await assertFails(updateDoc(doc(asUser(ADMIN), sessionPath), { deck: 'nope' }));
    await assertFails(updateDoc(doc(asUser(ADMIN), sessionPath), { adminId: OUTSIDER }));
    await assertFails(updateDoc(doc(asUser(MEMBER), sessionPath), { deck: 'fibonacci' }));

    // The vote rules read this back, so leave the deck as the fixture set it.
    await assertSucceeds(updateDoc(doc(asUser(ADMIN), sessionPath), { deck: 'modified' }));
  });
});

describe('participants', () => {
  it('accepts only your own row, with a sane name', async () => {
    const db = asUser(OUTSIDER);
    const row = { name: 'Outsider', joinedAt: Date.now() };
    await assertSucceeds(setDoc(doc(db, `${sessionPath}/participants/${OUTSIDER}`), row));
    await assertFails(setDoc(doc(db, `${sessionPath}/participants/${MEMBER}`), row));
    await assertFails(
      setDoc(doc(db, `${sessionPath}/participants/${OUTSIDER}`), {
        ...row,
        name: 'x'.repeat(41),
      })
    );
  });
});

describe('rounds', () => {
  it('are created and revealed by the admin only', async () => {
    const round = { question: 'New one', revealed: false, createdAt: Date.now() };
    await assertSucceeds(setDoc(doc(asUser(ADMIN), `${sessionPath}/rounds/by-admin`), round));
    await assertFails(setDoc(doc(asUser(MEMBER), `${sessionPath}/rounds/by-member`), round));
    await assertFails(
      updateDoc(doc(asUser(MEMBER), `${sessionPath}/rounds/${OPEN_ROUND}`), { revealed: true })
    );
  });
});

describe('votes', () => {
  it('are readable by everyone in the session — hiding them is the UI\'s job', async () => {
    await assertSucceeds(
      getDocs(collection(asUser(OUTSIDER), `${sessionPath}/rounds/${OPEN_ROUND}/votes`))
    );
  });

  it('accept only your own, and only a value from the deck', async () => {
    const db = asUser(MEMBER);
    await assertSucceeds(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 5, createdAt: Date.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 999, createdAt: Date.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, OUTSIDER)), { value: 5, createdAt: Date.now() })
    );
  });

  it('can be cleared while the round is open', async () => {
    const db = asUser(MEMBER);
    await assertSucceeds(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 3, createdAt: Date.now() })
    );
    await assertSucceeds(deleteDoc(doc(db, votePath(OPEN_ROUND, MEMBER))));
  });

  it('are frozen once the round is revealed', async () => {
    const db = asUser(MEMBER);
    await assertFails(
      setDoc(doc(db, votePath(REVEALED_ROUND, MEMBER)), { value: 8, createdAt: Date.now() })
    );
    await assertFails(deleteDoc(doc(db, votePath(REVEALED_ROUND, MEMBER))));
  });
});
