import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
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
// Two more one-purpose uids. Both tests below write a participant row and then act on it again,
// which the frozen `joinedAt` makes order-dependent: reusing a uid another test has already
// seated would turn their second write into a rewrite and fail for the wrong reason.
const LEAVER = 'leaver-uid';
const RETURNER = 'returner-uid';
const OPEN_ROUND = 'round-open';
const REVEALED_ROUND = 'round-revealed';

const sessionPath = `sessions/${CODE}`;

// A room whose deadline has already passed, and one used only for handing the admin role over —
// both separate from the main fixture, because either behaviour changes the room permanently and
// would leak into every test that follows.
const EXPIRED_CODE = 'GONE01';
const expiredSessionPath = `sessions/${EXPIRED_CODE}`;
const HANDOVER_CODE = 'HAND01';
const handoverSessionPath = `sessions/${HANDOVER_CODE}`;

const hoursFromNow = (hours: number): Timestamp =>
  Timestamp.fromMillis(Date.now() + hours * 60 * 60 * 1000);
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
      createdAt: Timestamp.now(),
      expiresAt: hoursFromNow(3),
    });
    await setDoc(doc(db, expiredSessionPath), {
      code: EXPIRED_CODE,
      adminId: ADMIN,
      deck: 'modified',
      createdAt: Timestamp.now(),
      expiresAt: hoursFromNow(-1),
    });
    await setDoc(doc(db, `${expiredSessionPath}/participants/${MEMBER}`), {
      name: 'Member',
      joinedAt: Timestamp.now(),
    });
    await setDoc(doc(db, `${expiredSessionPath}/rounds/${OPEN_ROUND}`), {
      question: 'Asked before the room closed',
      revealed: false,
      createdAt: Date.now(),
    });
    await setDoc(doc(db, handoverSessionPath), {
      code: HANDOVER_CODE,
      adminId: ADMIN,
      deck: 'modified',
      createdAt: Timestamp.now(),
      expiresAt: hoursFromNow(3),
    });
    await setDoc(doc(db, `${handoverSessionPath}/participants/${MEMBER}`), {
      name: 'Member',
      joinedAt: Timestamp.now(),
    });
    await setDoc(doc(db, otherSessionPath), {
      code: OTHER_CODE,
      adminId: OUTSIDER,
      deck: 'fibonacci',
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, `${otherSessionPath}/rounds/${OPEN_ROUND}`), {
      question: 'Elsewhere',
      revealed: false,
      createdAt: Date.now(),
    });
    await setDoc(doc(db, `${sessionPath}/participants/${MEMBER}`), {
      name: 'Member',
      joinedAt: Timestamp.now(),
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
    await setDoc(doc(db, votePath(REVEALED_ROUND, MEMBER)), {
      value: 5,
      createdAt: Timestamp.now(),
    });
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
    const valid = {
      code: 'NEWONE',
      adminId: ADMIN,
      deck: 'modified',
      createdAt: Timestamp.now(),
      expiresAt: hoursFromNow(3),
    };
    await assertSucceeds(setDoc(doc(db, 'sessions/NEWONE'), valid));
    await assertFails(setDoc(doc(db, 'sessions/OTHER1'), valid));
    await assertFails(
      setDoc(doc(db, 'sessions/OTHER2'), { ...valid, code: 'OTHER2', adminId: OUTSIDER })
    );
  });

  // The shape `createSession` actually writes, and the one case the suite was missing when the
  // deadline rules shipped: both documents in a single batch. Rules check each write in a batch
  // against the state before it, so the participant row is evaluated while the session document
  // still does not exist — which is where 0.3.0 refused every new room.
  it('is created together with its admin in one batch', async () => {
    const db = asUser(ADMIN);
    const code = 'BATCH1';
    const batch = writeBatch(db);
    // serverTimestamp() rather than a client Timestamp: this is the one case that mirrors
    // `createSession` field for field, so it is also what proves a pending sentinel satisfies
    // `is timestamp` — the rules see it as request.time.
    batch.set(doc(db, `sessions/${code}`), {
      code,
      adminId: ADMIN,
      deck: 'modified',
      createdAt: serverTimestamp(),
      expiresAt: hoursFromNow(3),
    });
    batch.set(doc(db, `sessions/${code}/participants/${ADMIN}`), {
      name: 'Admin',
      joinedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());

    // The same batch under somebody else's name is still refused: the create rule decides that,
    // and the arm that lets the participant row through does not soften it.
    // One instance, held once: `asUser` builds a fresh Firestore each call, and a batch will not
    // accept a document reference that came from a different one.
    const outsiderDb = asUser(OUTSIDER);
    const stolen = writeBatch(outsiderDb);
    stolen.set(doc(outsiderDb, 'sessions/BATCH2'), {
      code: 'BATCH2',
      adminId: ADMIN,
      createdAt: Timestamp.now(),
      deck: 'modified',
      expiresAt: hoursFromNow(3),
    });
    stolen.set(doc(outsiderDb, `sessions/BATCH2/participants/${OUTSIDER}`), {
      name: 'Outsider',
      joinedAt: Timestamp.now(),
    });
    await assertFails(stolen.commit());
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
    const base = {
      adminId: ADMIN,
      deck: 'modified',
      createdAt: Timestamp.now(),
      expiresAt: hoursFromNow(3),
    };
    await assertFails(
      setDoc(doc(db, 'sessions/EXTRA1'), { ...base, code: 'EXTRA1', secret: 'nope' })
    );
    // Not a `hasOnly` failure but the mirror of one: a subset is allowed by `hasOnly`, so what
    // catches a missing deck is the deck check itself.
    await assertFails(setDoc(doc(db, 'sessions/EXTRA2'), { adminId: ADMIN, code: 'EXTRA2' }));
  });

  // `hasOnly` bounds which keys may appear and says nothing about their values, so every field
  // the client writes needs a type of its own. Without this one `createdAt` could carry a string
  // of any length into a document every visitor to the room reads.
  it('rejects a createdAt that is not a timestamp', async () => {
    const db = asUser(ADMIN);
    const base = { adminId: ADMIN, deck: 'modified', expiresAt: hoursFromNow(3) };
    await assertFails(
      setDoc(doc(db, 'sessions/BADAT1'), { ...base, code: 'BADAT1', createdAt: Date.now() })
    );
    await assertFails(
      setDoc(doc(db, 'sessions/BADAT2'), { ...base, code: 'BADAT2', createdAt: 'x'.repeat(200) })
    );
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

describe('session lifetime', () => {
  it('requires a deadline, and one no further ahead than the ceiling', async () => {
    const db = asUser(ADMIN);
    const base = { adminId: ADMIN, deck: 'modified', createdAt: Timestamp.now() };
    await assertFails(setDoc(doc(db, 'sessions/NODATE'), { ...base, code: 'NODATE' }));
    await assertFails(
      setDoc(doc(db, 'sessions/TOOFAR'), {
        ...base,
        code: 'TOOFAR',
        expiresAt: hoursFromNow(24),
      })
    );
    await assertFails(
      setDoc(doc(db, 'sessions/PASTED'), {
        ...base,
        code: 'PASTED',
        expiresAt: hoursFromNow(-1),
      })
    );
  });

  it('is extended by its admin, within the ceiling, and by nobody else', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(ADMIN), sessionPath), { expiresAt: hoursFromNow(4) })
    );
    await assertFails(updateDoc(doc(asUser(ADMIN), sessionPath), { expiresAt: hoursFromNow(24) }));
    await assertFails(updateDoc(doc(asUser(MEMBER), sessionPath), { expiresAt: hoursFromNow(4) }));

    // The deadline is read by every write rule below, so leave the room comfortably open.
    await assertSucceeds(
      updateDoc(doc(asUser(ADMIN), sessionPath), { expiresAt: hoursFromNow(3) })
    );
  });

  it('stops accepting writes once the deadline has passed, but stays readable', async () => {
    const admin = asUser(ADMIN);
    const member = asUser(MEMBER);

    await assertSucceeds(getDoc(doc(member, expiredSessionPath)));
    await assertSucceeds(getDocs(collection(member, `${expiredSessionPath}/rounds`)));

    await assertFails(
      setDoc(doc(member, `${expiredSessionPath}/participants/${MEMBER}`), {
        name: 'Member',
        joinedAt: Timestamp.now(),
      })
    );
    await assertFails(
      setDoc(doc(admin, `${expiredSessionPath}/rounds/late`), {
        question: 'Too late',
        revealed: false,
        createdAt: Date.now(),
      })
    );
    await assertFails(
      setDoc(doc(member, `${expiredSessionPath}/rounds/${OPEN_ROUND}/votes/${MEMBER}`), {
        value: 5,
        createdAt: Timestamp.now(),
      })
    );
  });

  it('cannot be revived once it has expired', async () => {
    await assertFails(
      updateDoc(doc(asUser(ADMIN), expiredSessionPath), { expiresAt: hoursFromNow(3) })
    );
    await assertFails(updateDoc(doc(asUser(ADMIN), expiredSessionPath), { deck: 'powers' }));
  });
});

describe('admin handover', () => {
  it('refuses a handover to somebody who never joined, and from somebody who is not the admin', async () => {
    await assertFails(updateDoc(doc(asUser(ADMIN), handoverSessionPath), { adminId: STRANGER }));
    await assertFails(updateDoc(doc(asUser(MEMBER), handoverSessionPath), { adminId: MEMBER }));
  });

  it('hands the room to a participant, and takes it away from the previous admin', async () => {
    await assertSucceeds(updateDoc(doc(asUser(ADMIN), handoverSessionPath), { adminId: MEMBER }));

    // The room is the new admin's now: the old one keeps nothing.
    await assertFails(updateDoc(doc(asUser(ADMIN), handoverSessionPath), { deck: 'powers' }));
    await assertSucceeds(updateDoc(doc(asUser(MEMBER), handoverSessionPath), { deck: 'powers' }));
  });
});

describe('participants', () => {
  it('accepts only your own row, with a sane name', async () => {
    const db = asUser(OUTSIDER);
    const row = { name: 'Outsider', joinedAt: Timestamp.now() };
    await assertSucceeds(setDoc(doc(db, `${sessionPath}/participants/${OUTSIDER}`), row));
    await assertFails(setDoc(doc(db, `${sessionPath}/participants/${MEMBER}`), row));
    await assertFails(
      setDoc(doc(db, `${sessionPath}/participants/${OUTSIDER}`), {
        ...row,
        name: 'x'.repeat(41),
      })
    );
  });

  it('rejects an empty name and any field the model does not have', async () => {
    const db = asUser(STRANGER);
    const path = `${sessionPath}/participants/${STRANGER}`;
    await assertFails(setDoc(doc(db, path), { name: '', joinedAt: Timestamp.now() }));
    await assertFails(
      setDoc(doc(db, path), { name: 'Stranger', joinedAt: Timestamp.now(), role: 'observer' })
    );
  });

  // Presence is a beat on your own row and nothing more. What it must never become is a way to
  // write on somebody else's row, or to smuggle a field past the model — the beat travels on
  // the same `write` rule the name does.
  it('takes a presence beat on your own row, as a number, and nowhere else', async () => {
    const member = asUser(MEMBER);
    await assertSucceeds(
      updateDoc(doc(member, `${sessionPath}/participants/${MEMBER}`), { lastSeenAt: Date.now() })
    );
    await assertFails(
      updateDoc(doc(member, `${sessionPath}/participants/${ADMIN}`), { lastSeenAt: Date.now() })
    );
    await assertFails(
      updateDoc(doc(member, `${sessionPath}/participants/${MEMBER}`), { lastSeenAt: 'now' })
    );
  });

  // The beat is a write, so it stops at the deadline like every other write. A tab left open on
  // a closed room cannot keep reporting itself as present in it.
  it('refuses a presence beat once the room has closed', async () => {
    await assertFails(
      updateDoc(doc(asUser(MEMBER), `${expiredSessionPath}/participants/${MEMBER}`), {
        lastSeenAt: Date.now(),
      })
    );
  });

  // The same gap as on the session document, and worse here: the participant list is streamed
  // to every tab in the room, so an unbounded value on your own row is downloaded by everybody.
  // A number is refused too, which is the drift this suite used to have — the fixtures wrote
  // millis while the app wrote serverTimestamp(), so the tests were checking a shape the client
  // never produced.
  it('refuses a joinedAt that is not a timestamp', async () => {
    const db = asUser(STRANGER);
    const path = `${sessionPath}/participants/${STRANGER}`;
    await assertFails(setDoc(doc(db, path), { name: 'Stranger', joinedAt: Date.now() }));
    await assertFails(setDoc(doc(db, path), { name: 'Stranger', joinedAt: 'x'.repeat(200) }));
  });

  // `joinedAt` orders the room, so rewriting it is a way to move yourself in the list — and a
  // returning member would move to the bottom every time they came back. Freezing it must not
  // cost them the two writes that legitimately follow a rejoin, which travel on the same rule.
  it('freezes joinedAt without freezing the name or the presence beat', async () => {
    const db = asUser(RETURNER);
    const path = `${sessionPath}/participants/${RETURNER}`;
    const joinedAt = Timestamp.fromMillis(Date.now() - 60 * 1000);
    await assertSucceeds(setDoc(doc(db, path), { name: 'Returner', joinedAt }));

    await assertFails(setDoc(doc(db, path), { name: 'Returner', joinedAt: Timestamp.now() }));
    await assertSucceeds(updateDoc(doc(db, path), { name: 'Returner again' }));
    await assertSucceeds(updateDoc(doc(db, path), { lastSeenAt: Date.now() }));
    // Carrying the value back unchanged is still a write the rules accept, so the freeze bounds
    // the value rather than the verb.
    await assertSucceeds(setDoc(doc(db, path), { name: 'Returner once more', joinedAt }));
  });

  // Leaving needs a rule of its own: a delete carries no `request.resource`, so the field checks
  // on `write` are evaluated against nothing and deny it. That, and not a decision, is why
  // leaving used to be impossible.
  // Rows of their own rather than the shared fixture's: a test that deletes MEMBER would leave
  // every later case running against a session he is no longer in, and the failure would show up
  // somewhere else entirely.
  it('lets you leave, and lets the admin show somebody out', async () => {
    const leaver = asUser(LEAVER);
    const row = { name: 'Passing through', joinedAt: Timestamp.now() };
    await assertSucceeds(setDoc(doc(leaver, `${sessionPath}/participants/${LEAVER}`), row));
    await assertSucceeds(deleteDoc(doc(leaver, `${sessionPath}/participants/${LEAVER}`)));

    await assertSucceeds(
      setDoc(doc(asUser(STRANGER), `${sessionPath}/participants/${STRANGER}`), row)
    );
    await assertSucceeds(deleteDoc(doc(asUser(ADMIN), `${sessionPath}/participants/${STRANGER}`)));
  });

  it('refuses to remove somebody on behalf of a participant who is not the admin', async () => {
    await assertFails(deleteDoc(doc(asUser(OUTSIDER), `${sessionPath}/participants/${MEMBER}`)));
    await assertSucceeds(getDoc(doc(asUser(MEMBER), `${sessionPath}/participants/${MEMBER}`)));
  });

  // A closed room is a record. Emptying its participant list afterwards would leave votes
  // attributed to nobody.
  it('refuses to remove anybody once the room has closed', async () => {
    await assertFails(
      deleteDoc(doc(asUser(MEMBER), `${expiredSessionPath}/participants/${MEMBER}`))
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

    // `revealed` drives whether votes are still accepted, so the rules type it rather than
    // trusting the only client that writes it. Nothing but a bool gets through.
    await assertFails(updateDoc(doc(db, path), { revealed: 'true' }));
    await assertFails(updateDoc(doc(db, path), { revealed: 1 }));
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
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 5, createdAt: Timestamp.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 999, createdAt: Timestamp.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, OUTSIDER)), { value: 5, createdAt: Timestamp.now() })
    );
  });

  // '?' is the one value the rules accept that belongs to no deck, so it has to be spelled out
  // here: nothing else about the vote rules would catch it turning into "any string will do".
  it("take '?' whatever the deck is, and no other string", async () => {
    const db = asUser(MEMBER);
    await assertSucceeds(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: '?', createdAt: Timestamp.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: '??', createdAt: Timestamp.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: '5', createdAt: Timestamp.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, OUTSIDER)), { value: '?', createdAt: Timestamp.now() })
    );
    // And it is frozen with everything else once the cards are on the table.
    await assertFails(
      setDoc(doc(db, votePath(REVEALED_ROUND, MEMBER)), { value: '?', createdAt: Timestamp.now() })
    );
  });

  it('can be cleared while the round is open', async () => {
    const db = asUser(MEMBER);
    await assertSucceeds(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 3, createdAt: Timestamp.now() })
    );
    await assertSucceeds(deleteDoc(doc(db, votePath(OPEN_ROUND, MEMBER))));
  });

  it('are frozen once the round is revealed', async () => {
    const db = asUser(MEMBER);
    await assertFails(
      setDoc(doc(db, votePath(REVEALED_ROUND, MEMBER)), { value: 8, createdAt: Timestamp.now() })
    );
    await assertFails(deleteDoc(doc(db, votePath(REVEALED_ROUND, MEMBER))));
  });

  it('reject a field the model does not have', async () => {
    await assertFails(
      setDoc(doc(asUser(MEMBER), votePath(OPEN_ROUND, MEMBER)), {
        value: 5,
        createdAt: Timestamp.now(),
        comment: 'gut feeling',
      })
    );
  });

  it('reject a createdAt that is not a timestamp', async () => {
    const db = asUser(MEMBER);
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 5, createdAt: Date.now() })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 5, createdAt: 'x'.repeat(200) })
    );
    // What `castVote` actually sends, for the same reason the batch test uses it.
    await assertSucceeds(
      setDoc(doc(db, votePath(OPEN_ROUND, MEMBER)), { value: 5, createdAt: serverTimestamp() })
    );
  });

  // The admin's reach into other people's votes exists for one job — a participant being removed
  // takes their vote with them — and stops where every other write does: at the reveal.
  it('let the admin clear somebody else vote while the round is open, and never after', async () => {
    const member = asUser(MEMBER);
    await assertSucceeds(
      setDoc(doc(member, votePath(OPEN_ROUND, MEMBER)), { value: 3, createdAt: Timestamp.now() })
    );
    await assertSucceeds(deleteDoc(doc(asUser(ADMIN), votePath(OPEN_ROUND, MEMBER))));
    // The revealed round still holds the vote written in `before`, and nothing may touch it.
    await assertFails(deleteDoc(doc(asUser(ADMIN), votePath(REVEALED_ROUND, MEMBER))));
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
      setDoc(doc(db, votePath(OPEN_ROUND, STRANGER)), { value: 5, createdAt: Timestamp.now() })
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
        createdAt: Timestamp.now(),
      })
    );
    await assertFails(
      setDoc(doc(db, `${sessionPath}/participants/${STRANGER}`), {
        name: 'Nobody',
        joinedAt: Timestamp.now(),
      })
    );
    await assertFails(
      setDoc(doc(db, votePath(OPEN_ROUND, STRANGER)), { value: 5, createdAt: Timestamp.now() })
    );
  });
});
