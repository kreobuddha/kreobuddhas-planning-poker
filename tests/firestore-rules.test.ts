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
// Never joins anything and never votes anywhere else, so a test can ask what the rules make of
// a complete stranger without another test having quietly made them a participant first.
const STRANGER = 'stranger-uid';
const OPEN_ROUND = 'round-open';
const REVEALED_ROUND = 'round-revealed';

const sessionPath = `sessions/${CODE}`;
// A second room, with a different admin, purely to ask whether standing in one gives you
// anything in the other.
const OTHER_CODE = 'XYZ789';
const otherSessionPath = `sessions/${OTHER_CODE}`;
const votePath = (round: string, uid: string): string =>
  `${sessionPath}/rounds/${round}/votes/${uid}`;

let env: RulesTestEnvironment;

// `firestore()` hands back a modular `Firestore` — that is what the emulator gives us and what
// every `doc()` / `getDocs()` call below relies on — but `@firebase/rules-unit-testing` still
// declares its return as the *compat* `firebase.firestore.Firestore`. The cast corrects the
// library's own declaration; it is the one place this suite has to, and it changes nothing at
// runtime.
const asUser = (uid: string): Firestore =>
  env.authenticatedContext(uid).firestore() as unknown as Firestore;

const asAnon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

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
    await setDoc(doc(db, otherSessionPath), {
      code: OTHER_CODE,
      adminId: OUTSIDER,
      deck: 'fibonacci',
      createdAt: Date.now(),
    });
    await setDoc(doc(db, `${otherSessionPath}/rounds/${OPEN_ROUND}`), {
      question: 'Elsewhere',
      revealed: false,
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

  it('rejects a create carrying a field the model does not have', async () => {
    const db = asUser(ADMIN);
    const base = { adminId: ADMIN, deck: 'modified', createdAt: Date.now() };
    await assertFails(
      setDoc(doc(db, 'sessions/EXTRA1'), { ...base, code: 'EXTRA1', expiresAt: Date.now() })
    );
    // Not a `hasOnly` failure but the mirror of one: a subset is allowed by `hasOnly`, so what
    // catches a missing deck is the deck check itself.
    await assertFails(setDoc(doc(db, 'sessions/EXTRA2'), { adminId: ADMIN, code: 'EXTRA2' }));
  });

  it('cannot be deleted, by the admin or anyone else', async () => {
    await assertFails(deleteDoc(doc(asUser(ADMIN), sessionPath)));
    await assertFails(deleteDoc(doc(asUser(MEMBER), sessionPath)));
  });

  it('grants nothing in one room to the admin of another', async () => {
    const intruder = { question: 'Not yours', revealed: false, createdAt: Date.now() };
    await assertFails(updateDoc(doc(asUser(ADMIN), otherSessionPath), { deck: 'powers' }));
    await assertFails(setDoc(doc(asUser(ADMIN), `${otherSessionPath}/rounds/intruder`), intruder));
    await assertFails(
      updateDoc(doc(asUser(ADMIN), `${otherSessionPath}/rounds/${OPEN_ROUND}`), {
        revealed: true,
      })
    );

    // ...while that room's own admin is unaffected. Restored immediately: `deckValues` is read
    // back by the vote rules.
    await assertSucceeds(updateDoc(doc(asUser(OUTSIDER), otherSessionPath), { deck: 'powers' }));
    await assertSucceeds(updateDoc(doc(asUser(OUTSIDER), otherSessionPath), { deck: 'fibonacci' }));
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

  it('rejects an empty name and any field beyond name and joinedAt', async () => {
    const db = asUser(STRANGER);
    const path = `${sessionPath}/participants/${STRANGER}`;
    await assertFails(setDoc(doc(db, path), { name: '', joinedAt: Date.now() }));
    await assertFails(
      setDoc(doc(db, path), { name: 'Stranger', joinedAt: Date.now(), role: 'observer' })
    );
  });

  // There is no "leave the room" in this app, and this is why: a delete carries no
  // `request.resource`, so the field checks on `write` cannot pass and the rule denies it.
  it('cannot be removed, not even by the participant themselves', async () => {
    await assertFails(deleteDoc(doc(asUser(MEMBER), `${sessionPath}/participants/${MEMBER}`)));
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

  it('rejects a create that is malformed, oversized or already revealed', async () => {
    const db = asUser(ADMIN);
    const clock = { revealed: false, createdAt: Date.now() };
    await assertFails(
      setDoc(doc(db, `${sessionPath}/rounds/bad-empty`), { ...clock, question: '' })
    );
    await assertFails(
      setDoc(doc(db, `${sessionPath}/rounds/bad-long`), { ...clock, question: 'x'.repeat(201) })
    );
    await assertFails(
      setDoc(doc(db, `${sessionPath}/rounds/bad-extra`), {
        ...clock,
        question: 'Fine',
        note: 'not part of the model',
      })
    );
    // A round that arrives already revealed would be a result with no vote behind it.
    await assertFails(
      setDoc(doc(db, `${sessionPath}/rounds/bad-open`), {
        question: 'Fine',
        revealed: true,
        createdAt: Date.now(),
      })
    );
    await assertFails(
      setDoc(doc(db, `${sessionPath}/rounds/bad-clock`), {
        question: 'Fine',
        revealed: false,
        createdAt: 'just now',
      })
    );
  });

  it('opens and reopens, but never rewrites the question', async () => {
    const db = asUser(ADMIN);
    const path = `${sessionPath}/rounds/reopenable`;
    await assertSucceeds(
      setDoc(doc(db, path), { question: 'Asked once', revealed: false, createdAt: Date.now() })
    );
    await assertSucceeds(updateDoc(doc(db, path), { revealed: true }));
    // The point of the pair: a revealed round can go back to accepting votes.
    await assertSucceeds(updateDoc(doc(db, path), { revealed: false }));

    await assertFails(updateDoc(doc(db, path), { question: 'Asked differently' }));
    await assertFails(updateDoc(doc(db, path), { revealed: true, question: 'Both at once' }));
  });

  it('cannot be deleted, so a revealed round stays on the record', async () => {
    await assertFails(deleteDoc(doc(asUser(ADMIN), `${sessionPath}/rounds/${REVEALED_ROUND}`)));
    await assertFails(deleteDoc(doc(asUser(MEMBER), `${sessionPath}/rounds/${OPEN_ROUND}`)));
  });
});

describe('votes', () => {
  it("are readable by everyone in the session — hiding them is the UI's job", async () => {
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

  it('reject a field the model does not have', async () => {
    await assertFails(
      setDoc(doc(asUser(MEMBER), votePath(OPEN_ROUND, MEMBER)), {
        value: 5,
        createdAt: Date.now(),
        comment: 'gut feeling',
      })
    );
  });

  it('cannot be cleared on someone else behalf', async () => {
    await assertFails(deleteDoc(doc(asUser(OUTSIDER), votePath(OPEN_ROUND, MEMBER))));
  });

  // Pins a gap rather than a guarantee. The rules check whose vote it is and whether the round
  // is open, but never that the voter is in `participants` — so anyone signed in who knows a
  // room code can vote in it without appearing in the list. It is visible in the UI (the vote
  // shows up under "Unknown" at reveal) and it needs a deliberate decision, not a quiet fix
  // here. When that decision is made, this assertion is the one that flips.
  it('are accepted from someone who never joined the session', async () => {
    const db = asUser(STRANGER);
    await assertSucceeds(
      setDoc(doc(db, votePath(OPEN_ROUND, STRANGER)), { value: 5, createdAt: Date.now() })
    );
    await assertSucceeds(deleteDoc(doc(db, votePath(OPEN_ROUND, STRANGER))));
  });
});

// Anonymous sign-in means every real user is authenticated before they see anything, so
// `isSignedIn()` turns almost nobody away in practice. It is still the outermost ring of the
// only server-side boundary this app has, and the browser cannot tell you whether it holds — a
// denied read arrives looking exactly like an empty one. Hence: cheap, and worth stating.
describe('unauthenticated access', () => {
  it('is refused everywhere, read and write alike', async () => {
    const db = asAnon();
    await assertFails(getDoc(doc(db, sessionPath)));
    await assertFails(getDocs(collection(db, `${sessionPath}/participants`)));
    await assertFails(getDocs(collection(db, `${sessionPath}/rounds`)));
    await assertFails(getDocs(collection(db, `${sessionPath}/rounds/${OPEN_ROUND}/votes`)));

    await assertFails(
      setDoc(doc(db, 'sessions/NOAUTH'), {
        code: 'NOAUTH',
        adminId: STRANGER,
        deck: 'modified',
        createdAt: Date.now(),
      })
    );
    await assertFails(
      setDoc(doc(db, `${sessionPath}/participants/${STRANGER}`), {
        name: 'Nobody',
        joinedAt: Date.now(),
      })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, STRANGER)), { value: 5, createdAt: Date.now() })
    );
  });
});
