# KB Audit — kreobuddhas-planning-poker vs. Unigine-KB

An audit of this project against `../../Unigine-KB.md` (the knowledge base distilled from
Rustam's prior Unigine work). Two layers: whether the code follows its own stated
[docs/code-rules.md](code-rules.md), and how it compares to the broader KB — what's carried
over, what's simplified for a small solo app, and what's a genuine improvement over patterns
the KB flagged as accepted tech debt at Unigine.

> Audited 2026-08-11 by reading all 17 source files in full, plus `docs/code-rules.md`,
> `CLAUDE.md`, `firebase/firestore.rules`, and every config file at repo root.

> **Snapshot, not living documentation.** Kept as a record of what the codebase looked like on
> 2026-08-11; its file references are deliberately not rewritten as the code moves. Since then:
> `src/hooks/useAuth.ts` became `src/auth/useCheckAuth.ts` and `src/pages/` became
> `src/main/sections/`; `VoteCards`'s `disabled` prop (§4) is now driven by the in-flight vote;
> and §3's "real server-enforced access control" no longer holds — the `voteStatus` collection
> was removed and hiding votes before the reveal is now UI-level by choice, so on that specific
> axis the project has moved back toward the Unigine pattern the section contrasts it with.
> See `README.md` for the current model.

---

## 1. Rule Compliance

Every rule in `docs/code-rules.md` holds across the whole codebase — no violations found.

| # | Rule | Result | Evidence |
|---|---|---|---|
| 1 | Arrow functions only, explicit return types | ✅ Pass | `App`, `Home`, `Room`, `useAuth`, `generateSessionCode`, and every handler (`handleCreate`, `handleVote`, `handleReveal`, ...) are arrow-const with an explicit return type. No `function` declarations anywhere. |
| 2 | One folder per component/page, colocated `.scss` imported first | ✅ Pass | `ParticipantList/`, `Results/`, `VoteCards/`, `Home/`, `Room/` all follow the pattern; each `.tsx` file's first import is its own `.scss`. `App.tsx`/`main.tsx` correctly use the documented exception (no folder, no stylesheet of their own). |
| 3 | No `../../` — use `@/` alias | ✅ Pass | Zero relative parent-traversal imports found. Same-folder imports (`./Results.scss`, `./App.tsx`) correctly stay relative per the rule's own carve-out. |
| 4 | `I`-prefixed interfaces for domain types only | ✅ Pass | `ISession`, `IParticipant`, `IRound`, `IVote` (`src/types.ts`) are prefixed; prop interfaces (`ResultsProps`, `HomeProps`, `RoomProps`, `ParticipantListProps`, `VoteCardsProps`) and the hook result (`UseAuthResult`) are correctly left unprefixed. |
| 5 | `clsx` for conditional classNames, never template literals | ✅ Pass | Both conditional-className sites (`VoteCards.tsx`, `ParticipantList.tsx`) use `clsx`. No template-literal conditional classNames anywhere in the codebase. |
| 6 | SCSS + BEM, full selectors (no `&__` shorthand) | ✅ Pass | All 6 stylesheets write every block/element as a full top-level selector (`.vote-cards__card`, `.results__average`, `.room__reveal-btn`, ...). Nesting appears only for modifiers (`&--selected`, `&--voted`), media queries, or unclassed native tags one level deep (`.home__card { p { ... } }`) — exactly the rule's allowance, never exceeded. |
| 7 | Prettier (100-char, single quotes, `es5` commas, `arrowParens: always`) | ✅ Pass | `.prettierrc` matches exactly; spot-checked formatting across sampled files is consistent with it. |

---

## 2. Consistency with Unigine-KB

Patterns that reproduce Unigine-KB conventions independently, not by copy-paste — worth noting because they show up again at 1/10th the scale rather than being abandoned once there's no team/lint enforcement:

- **Value-named, not scale-indexed design tokens.** `src/index.scss` defines `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-soft`, `--success` — the same "named CSS custom property per concrete need" habit documented in Unigine-KB §13, rather than a generated scale. At this project's size it hasn't drifted (8 tokens, no bloat), but the *shape* of the convention — informal tokens, not a systematic scale — is identical.
- **Same lack of a breakpoint/border-radius token, reproduced at smaller scale.** Two one-off breakpoints (`Room.scss:18` → `max-width: 700px`, `Home.scss:26` → `max-width: 560px`) and two informal border-radius values (`8px` for small controls — buttons, inputs, vote cards, result cards; `12px` for larger card containers — `.home__card`, `.room__sidebar`, `.room__main`) with no shared variable behind either. This is exactly the "disciplined by convention, not by token" pattern Unigine-KB §13 documents at Unigine — reappearing here unprompted, at a scale small enough that it hasn't caused drift yet, but the same underlying habit.
- **The `AGENTS.md`-writing habit, scaled down.** `CLAUDE.md` + `docs/code-rules.md` is a direct, smaller-scale continuation of the `AGENTS.md` + `docs/ai/*.md` documentation pattern Unigine-KB §9 calls out as a "practiced skill" — same shape (a durable, AI-agent-facing rules document with an explicit "why" for each rule), applied to a one-person project instead of a team codebase. `code-rules.md` even names its own source (`../../Unigine-KB.md`) directly.
- **Same pragmatic, no-overengineering discipline.** `CLAUDE.md`'s explicit instruction not to add abstractions, config flags, tests, or error boundaries "unasked" mirrors the permissive-but-deliberate engineering philosophy in Unigine-KB §9 (the lint-rule relaxations, the "don't add `updateQueryData` without profiling" discipline) — the same judgment call about where complexity earns its keep, applied consistently across a very different scale of project.

---

## 3. Improvements Over KB-Flagged Unigine Tech Debt

Two places where this project does *better* than the patterns Unigine-KB records as accepted tradeoffs — worth calling out explicitly rather than treating the KB as a fixed template to replicate:

- **Real server-enforced access control, not "not a security boundary."** Unigine-KB §4 documents that both Unigine apps have "no router-level guards; access control is redirect-in-effect per page/component, explicitly documented as 'not a security boundary.'" This project inverts that: `firebase/firestore.rules` *is* the actual security boundary, enforced server-side. It also reproduces the specific pattern the KB praises elsewhere in the Unigine work (the `{ type, id }`-tagged, "public status doc + gated value doc" split in `commonSupportApi.ts`) almost exactly: `votes/{uid}` holds the real value and is read-gated on `revealed == true` or ownership, while a parallel `voteStatus/{uid}` doc (`firestore.rules:34-37`) is openly readable so the UI can show "who's voted" without leaking values early. Same architectural instinct, this time backed by an actual enforced boundary instead of a documented gap.
- **No manual JWT/localStorage/cross-tab-refresh machinery.** Unigine-KB §4 calls the hand-rolled cross-tab token-refresh coordination (`crossTabAuth.ts` at add-on-store-frontend) "the most sophisticated hand-written subsystem" in that codebase — and also documents its accepted XSS/token-storage tradeoffs. `src/hooks/useAuth.ts` sidesteps that entire problem class in ~20 lines by using Firebase Anonymous Auth instead of hand-rolled JWT storage. Worth reading as "recognized when the complex pattern wasn't needed here," not as the pattern being forgotten — the underlying skill (multi-tab session awareness, token lifecycle understanding) is what made the simpler choice a deliberate one rather than an accidental gap.

---

## 4. Minor Observations

Not rule violations — noted for completeness, not flagged for action (this is an audit, not a code review):

- `VoteCards`'s `disabled` prop is hardcoded to `false` at its only call site (`Room.tsx:218`) — the prop exists on the component but nothing currently drives it `true`. `Home.tsx` has an analogous `busy` state that disables its own submit buttons during an async call (`Home.tsx:28,103,115`); `Room.tsx`'s `handleVote` has no equivalent in-flight guard. Just an unused knob, not a bug.
- `Results.tsx:11-12`'s `nameFor(v.id)` only works because a vote document's ID is documented to double as the voting participant's uid (the comment on `IVote` in `src/types.ts:22`). Correctly relies on that convention, and the convention is spelled out where a reader would need it — the same "self-documented, non-obvious ID reuse" habit the KB records repeatedly at Unigine (e.g. the participant-doc-ID-is-the-auth-uid comment on `IParticipant` right above it).
