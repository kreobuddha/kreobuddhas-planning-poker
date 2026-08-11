# Code rules

Personal style rules for this repo. These apply on top of the general conventions in
[CLAUDE.md](../CLAUDE.md) and should be followed by any AI session working here.

## 1. Arrow functions only

No `function` declarations anywhere — components, hooks, utilities, and internal handlers
(e.g. event handlers inside a component) all use arrow-function consts.

**Why:** consistent call-site and definition syntax across the codebase; arrow functions don't
rebind `this`, which matters less in React function components but keeps the style uniform
whether or not a given function ever touches `this`.

Components and pages — named const, default-exported at the bottom (not an anonymous
`export default () => {}`, so the name still shows up in React DevTools and stack traces):

```tsx
const Results = ({ votes, participants }: ResultsProps) => {
  return <div>...</div>;
};

export default Results;
```

Hooks and utilities — named export, no default export:

```ts
export const useAuth = () => {
  // ...
};

export const generateSessionCode = (length = 6): string => {
  // ...
};
```

Internal handlers inside a component follow the same pattern:

```tsx
const handleVote = async (value: number) => {
  // ...
};
```

## 2. SCSS, one folder per component/page

Every component and page lives in its own folder containing the component and its stylesheet,
named identically:

```
src/components/Results/Results.tsx
src/components/Results/Results.scss
src/pages/Room/Room.tsx
src/pages/Room/Room.scss
```

The component imports its own stylesheet directly: `import './Results.scss';`.

**Why:** colocation — a component's markup, logic, and styles live together, so nothing needs
cross-referencing to know what styles apply to what, and deleting a component means deleting
one folder rather than hunting down its rules in a shared file.

Global reset and CSS custom properties (`--bg`, `--accent`, etc.) live in `src/index.scss`,
imported once in `main.tsx`. `App.tsx` and `main.tsx` are the exception to the folder rule —
they stay at `src/` root as the app's entry point, not a reusable unit, so `App.tsx` has no
folder or stylesheet of its own (its one rule, `.app-loading`, lives in `src/index.scss`).

`src/hooks/` and `src/lib/` are also exceptions — they stay flat, single-file modules
(`src/hooks/useAuth.ts`, `src/lib/firebase.ts`), since the folder+stylesheet pattern is
specifically for things that render UI.

## 3. No `../../` imports — use the `@/` alias

Anything outside the current folder is imported via the `@/` alias, which resolves to `src/`
(configured in `vite.config.ts`'s `resolve.alias` and `tsconfig.app.json`'s `paths`):

```ts
import { db } from '@/lib/firebase';
import type { Vote } from '@/types';
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
