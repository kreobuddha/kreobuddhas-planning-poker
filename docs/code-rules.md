# Code rules

Personal style rules for this repo, distilled from prior production work (see
`../../Unigine-KB.md` for the source). These apply on top of the general conventions in
[CLAUDE.md](../CLAUDE.md) and should be followed by any AI session working here.

## 1. Arrow functions only, with explicit return types

No `function` declarations anywhere — components, hooks, utilities, and internal handlers
(e.g. event handlers inside a component) all use arrow-function consts, and every exported
function/hook/component annotates its return type explicitly rather than relying on inference.

**Why:** consistent call-site and definition syntax across the codebase; arrow functions don't
rebind `this`. Explicit return types are a personal habit carried over from prior work — they
make a function's contract readable at the definition site without needing to trace the body,
and catch a wrong `return` immediately at the call site instead of silently widening the
inferred type.

Components and pages — named const, default-exported at the bottom (not an anonymous
`export default () => {}`, so the name still shows up in React DevTools and stack traces):

```tsx
const Results = ({ votes, participants }: ResultsProps): ReactElement => {
  return <div>...</div>;
};

export default Results;
```

Hooks and utilities — named export, no default export:

```ts
export const useAuth = (): UseAuthResult => {
  // ...
};

export const generateSessionCode = (length = 6): string => {
  // ...
};
```

Internal handlers inside a component follow the same pattern:

```tsx
const handleVote = async (value: number): Promise<void> => {
  // ...
};
```

## 2. SCSS, one folder per component/page, imported first

Every component and page lives in its own folder containing the component and its stylesheet,
named identically:

```
src/components/Results/Results.tsx
src/components/Results/Results.scss
src/pages/Room/Room.tsx
src/pages/Room/Room.scss
```

The component imports its own stylesheet directly, and that import comes **first**, before any
other import:

```tsx
import './Results.scss';
import type { IParticipant, IVote } from '@/types';
```

**Why:** colocation — a component's markup, logic, and styles live together, so nothing needs
cross-referencing to know what styles apply to what, and deleting a component means deleting
one folder rather than hunting down its rules in a shared file. The stylesheet import goes
first as a scan-order convention: it's the first thing you'd want to know about a component
file (what it looks like), before its data dependencies.

Global reset and CSS custom properties (`--bg`, `--accent`, etc.) live in `src/index.scss`,
imported once in `main.tsx`. `App.tsx` and `main.tsx` are the exception to the folder rule —
they stay at `src/` root as the app's entry point, not a reusable unit, so `App.tsx` has no
folder or stylesheet of its own (its one rule, `.app-loading`, lives in `src/index.scss`).

`src/hooks/`, `src/lib/`, and `src/config.ts` are also exceptions — they stay flat, single-file
modules (`src/hooks/useAuth.ts`, `src/lib/firebase.ts`, `src/config.ts` for constants), since
the folder+stylesheet pattern is specifically for things that render UI.

## 3. No `../../` imports — use the `@/` alias

Anything outside the current folder is imported via the `@/` alias, which resolves to `src/`
(configured in `vite.config.ts`'s `resolve.alias` and `tsconfig.app.json`'s `paths`):

```ts
import { db } from '@/lib/firebase';
import type { IVote } from '@/types';
import Results from '@/components/Results/Results';
```

Only same-folder imports stay relative, since they can't go wrong when a folder moves:

```ts
import './Results.scss';
```

**Why:** once components/pages live in their own folders, a plain relative import from a
component to something in `src/lib` or `src/types` would need to climb two levels
(`../../lib/firebase`), and that depth grows every time something gets nested further. The
alias keeps every cross-folder import the same length and shape regardless of where the
importing file lives, and makes it trivial to move a file without rewriting its imports.

## 4. `I`-prefixed interfaces for domain types

Interfaces representing data shapes — Firestore documents, API payloads — are prefixed with
`I`: `ISession`, `IParticipant`, `IRound`, `IVote` (all in `src/types.ts`). Component prop
interfaces (`ResultsProps`, `HomeProps`, ...) are **not** prefixed — this convention is
specifically for data shapes, not React props.

```ts
export interface IVote {
  id: string;
  value: number;
  createdAt: number;
}
```

**Why:** makes it instantly visible at a glance whether an identifier is a data-shape type or
something else (a props interface, a union, a component) without needing to jump to its
definition.

## 5. `clsx` for conditional classNames, never template literals

```tsx
className={clsx('vote-cards__card', selected === value && 'vote-cards__card--selected')}
```

not

```tsx
className={`vote-card ${selected === value ? 'selected' : ''}`}
```

**Why:** template-literal conditional classNames are error-prone as conditions accumulate
(stray spaces, forgotten ternary branches) and don't short-circuit cleanly for falsy values the
way `clsx`'s `&&` pattern does.

## 6. SCSS + BEM, written as full selectors

Class names follow `block__element--modifier`. Every block and element is its own **top-level,
full-text selector** — never built via `&__element` nesting shorthand:

```scss
.vote-cards {
  // block
}

.vote-cards__card {
  // element — written out in full, not `&__card`

  &--selected {
    // modifier — nesting is fine one level deep under its own element
  }
}
```

Only nest for a modifier (`&--x`), a media query, or a plain unclassed native tag with no BEM
identity of its own (a bare `<p>` or `<strong>`) — never more than one level deep. Never nest
`&__element` inside `.block { }` shorthand-style.

**Why:** the shorthand form (`.block { &__element { ... } } `) means the string
`.vote-cards__card` never appears literally anywhere in the file, so it's not findable with a
plain text search (`Cmd+F` in VS Code, `grep`) — you'd have to mentally concatenate the parent
selector and the `&__` fragment. Writing every block/element as its own full selector keeps
every class name greppable exactly as it appears in a `className` prop. The one-level-deep cap
on nesting keeps specificity low and avoids the opposite failure mode (three-plus levels deep,
which reintroduces the "have to trace the nesting to know the real selector" problem BEM is
meant to solve).

## 7. Prettier

Config lives in `.prettierrc`: 100-char print width, single quotes, `es5` trailing commas,
`arrowParens: always`. Run `npm run format` to apply it repo-wide.

**Why:** a fixed, non-negotiable formatting layer means style discussions never happen over
whitespace — carried over from prior team conventions rather than picked arbitrarily.
