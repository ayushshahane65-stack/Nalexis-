# AGENTS.md — Frontend Design Engineering Constitution

This file is the source of truth for any AI agent (Claude Code, Cursor, v0, Copilot, etc.) writing or modifying UI code in this repo. Rules marked **MUST** / **NEVER** are non-negotiable. Rules marked **PREFER** are defaults you may deviate from only with a stated reason.

If a request conflicts with this file, follow this file and say so. If this file is silent, match the surrounding code, not your defaults.

> Save as `AGENTS.md` in the repo root. For tools that expect other names, copy or symlink to `CLAUDE.md` or `.cursorrules`.

---

## 0. How to Work

You are an architect's builder, not a generic generator. Work in this order for every UI task:

1. **Read first.** Inspect `tailwind.config.*`, `globals.css`, `@/components/ui/*`, and one or two similar existing components before writing anything.
2. **Plan briefly.** State the components you'll create or reuse, the tokens you'll use, and the four states each will handle. Keep it to a short list.
3. **Build in passes.** Scaffold → components one at a time → polish. Do not build the whole screen in one shot.
4. **Self-audit.** Before declaring done, run the Vibe Audit (Section 11) and report any failures honestly.
5. **Keep diffs small.** Don't refactor unrelated files, rename things, or add dependencies unless asked.

If requirements are ambiguous (what the product is, who the user is, what data shape to expect), ask one focused question or state your assumption explicitly. Never silently invent product behavior.

---

## 1. Stack & Project Conventions

Adjust this section to match the repo. Defaults below assume:

- **Framework:** React + TypeScript (strict mode). Next.js App Router if present.
- **Styling:** Tailwind CSS with semantic tokens
- **Primitives:** shadcn/ui on Radix UI, imported from `@/components/ui`
- **Icons:** `lucide-react`
- **Motion:** `framer-motion` (or `motion`)
- **Forms:** `react-hook-form` + `zod` if already installed
- **Data fetching:** whatever the repo already uses (TanStack Query, SWR, server components). Do not introduce a second one.

Rules:

- **MUST** use `@/` path aliases; no deep relative imports (`../../../`).
- **MUST** use function components and hooks. No class components.
- **MUST** type all props and API data. **NEVER** use `any`; use `unknown` and narrow.
- **NEVER** add a dependency without asking. Check whether an installed package already does the job.
- **File layout:** one component per file, PascalCase filenames, co-locate its skeleton and types. Mock data lives in a separate `*.mock.ts` file, never inline in the component.

---

## 2. Design Direction (Escaping the "Generic LLM Default")

Unguided AI output converges on a recognizable, low-effort look. Do not produce it.

**NEVER default to:**

- `rounded-3xl` on everything, or one identical radius on every element regardless of hierarchy
- Purple-to-blue (or any) decorative linear gradients
- Heavy or stacked drop shadows; the same soft shadow under every card
- Content chopped into identical rounded cards when a table, list, or plain section fits better
- Decorative eyebrow labels above every heading, or decorative numbered markers (01 / 02 / 03) on content that isn't a real sequence
- Emoji as icons, or placeholder copy like "Lorem ipsum" and "Feature One"

**DO:**

- Pick one neutral scale (Slate **or** Zinc, not both) and **one** accent color. Use the accent sparingly, for primary actions and key state.
- Establish hierarchy through spacing, type size, and weight before reaching for borders, shadows, or color.
- Use a restrained radius scale: for example `rounded-md` for controls, `rounded-lg` for containers. Vary by hierarchy.
- Spend visual boldness in **one** place per screen. Keep everything else quiet and disciplined.
- Write real, specific copy from the user's point of view (see Section 9).

If the task doesn't specify a direction, propose one in two lines (tone, accent color, density) before building.

---

## 3. Styling & Tokens

- **MUST** use Tailwind semantic tokens and the scale defined in `tailwind.config.*`.
- **BANNED:** arbitrary values. No `p-[17px]`, `w-[342px]`, `text-[#123456]`, `bg-[#0b0b0b]`. Use `p-4`, `w-80`, `text-slate-900`, or a token.
  - *Exception:* genuinely one-off values with no token equivalent (e.g. `grid-cols-[1fr_auto]`, `aspect-[4/3]`). Add a one-line comment explaining why.
- **MUST** use `gap-*` for spacing between siblings instead of margin hacks. Use a consistent spacing rhythm (`gap-4`, `p-6`, `space-y-6`).
- **NEVER** use inline `style={{}}` for anything Tailwind can express.
- **NEVER** use `!important` or `!` Tailwind modifiers to win specificity fights. Fix the structure.
- **MUST** merge conditional classes with the repo's `cn()` helper (`clsx` + `tailwind-merge`). No string concatenation.
- Use `class-variance-authority` (`cva`) for components with variants, matching how shadcn components are built.

### Dark mode

- **MUST** support dark mode via the `dark:` prefix on the Slate or Zinc scale.
- **NEVER** hardcode `bg-white` / `text-black` without a `dark:` counterpart. Prefer semantic tokens (`bg-background`, `text-foreground`, `border-border`) so both themes work automatically.
- Muted text **MUST** meet WCAG AA against its actual background in **both** themes (4.5:1 for body text, 3:1 for large text and UI components).

### Typography

- Set a clear type scale and stick to it. One or two font families, and if two, make them clearly distinct.
- Keep line length under about 80 characters for body text.
- Use sentence case for UI text. Avoid all-caps labels.
- Avoid accenting a single word in a headline with a different color or italic; it's a generated-page tell.

### Responsive

- **MUST** design mobile-first (`base` → `sm:` → `md:` → `lg:`).
- Test mentally at 360px, 768px, and 1280px. No horizontal page scroll at any width.
- Tables and code blocks scroll **inside** an `overflow-x-auto` container; the page never scrolls sideways.
- Touch targets are at least 40×40px on mobile.

---

## 4. Architecture & Components

- **MUST** reuse `@/components/ui` (shadcn/Radix) before building anything new. Do not re-implement Button, Dialog, Popover, Select, Tooltip, Tabs, etc.
- If a primitive is missing, add it the shadcn way (Radix underneath, `cn()`, `cva` variants). Don't invent a bespoke one.
- **PREFER** compound components (`Card`, `Card.Header`, `Card.Body`) for anything with multiple slots.
- **PREFER** `asChild` for slot-based composition instead of wrapping elements in extra `div`s.
- **MUST** keep components small and single-purpose. If a file passes about 200 lines or does more than one job, split it.
- **MUST** separate concerns: data fetching in hooks or containers, presentation in components. Presentational components receive data via props and are trivially testable.
- **NEVER** prop-drill more than two levels; use composition or context.
- **NEVER** put derived state in `useState`. Compute it during render or with `useMemo` when it's actually expensive.
- **NEVER** use `useEffect` to sync state you could derive, or to fetch data if the repo has a data-fetching library.
- Use stable, meaningful `key`s. Never array index for reorderable lists.

### Icons

- Use `lucide-react` only.
- Decorative icons: `aria-hidden="true"`.
- Icon-only buttons **MUST** have an accessible name (`aria-label` or visually hidden text).
- Size icons via Tailwind (`size-4`, `size-5`), not inline styles.

---

## 5. Semantic HTML & Accessibility

Accessibility is a requirement, not a polish item.

- **MUST** use semantic elements: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `ul`/`li`, `table`, `button`, `a`, `label`.
- **NEVER** build "div soup." Every clickable thing is a `<button>` (action) or `<a>`/`<Link>` (navigation).
- **NEVER** attach `onClick` to a `div` or `span`. If you truly must, add `role`, `tabIndex={0}`, and `onKeyDown` for Enter/Space. Prefer fixing it by using a real element.
- One `<h1>` per page. Heading levels descend without skipping.
- Every form input has a visible, associated `<label>`. Placeholders are not labels.
- Errors are announced: use `aria-invalid`, `aria-describedby`, and `role="alert"` (or `aria-live="polite"`) for async status.
- Images have meaningful `alt`. Decorative images use `alt=""`.
- Never convey information by color alone. Pair with text or an icon.
- Respect `prefers-reduced-motion` (see Section 6).
- Tables use `<th scope>` and `<caption>` or an accessible name.

### Focus

- **NEVER** use `outline-none` (or `focus:outline-none`) without a replacement.
- Every interactive element **MUST** show a visible `focus-visible` ring that stays distinct from the element's own border:

  ```
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
  ```

- Every interactive element is reachable and operable with Tab, Shift+Tab, Enter, Space, and Esc where appropriate.
- Overlays (Dialog, Popover, Dropdown) **MUST** trap focus, close on `Esc`, and return focus to the trigger. Use Radix; don't hand-roll this.
- Tab order follows visual order. Never use `tabIndex` greater than 0.

---

## 6. Motion & Interaction

- **Library:** `framer-motion` (or `motion`). No other animation libraries.
- **PREFER** spring physics over duration/easing curves for enter, exit, and layout motion:

  ```ts
  export const spring = { type: "spring", stiffness: 350, damping: 28 } as const;
  export const springSoft = { type: "spring", stiffness: 400, damping: 30 } as const; // popovers, overlays
  ```

  Define these once in a shared `lib/motion.ts` and import them. Don't scatter magic numbers.
- **Buttons** and other pressable controls **MUST** have tactile feedback: `active:scale-[0.98]` and a visible hover state.
- Use `LayoutGroup` / `layoutId` for shared-element transitions (tab indicators, nav highlights, reordering) instead of linear opacity fades.
- Animate only `transform` and `opacity`. Never animate `width`, `height`, `top`, or `left` (use `layout` props instead).
- Motion answers a user action (open, expand, confirm, reorder). **NEVER** add fade-and-slide-up entrances to every section or hover lift to every card. Non-user-triggered motion is rare and deliberate.
- **MUST** honor reduced motion:

  ```tsx
  const reduce = useReducedMotion();
  // If reduce: skip transforms, use instant or opacity-only transitions.
  ```

- Use `AnimatePresence` for exit animations; components that animate out need a stable `key`.

---

## 7. Data & Resilience: The 4-State Contract

**Every data-driven component MUST implement all four states.** A component is not done, and must not be presented as done, until all four are built and demonstrable.

| State | Requirements |
|---|---|
| **Loading (Skeleton)** | A skeleton that matches the **exact layout** of the loaded component (same dimensions, grid, and spacing) so nothing shifts on load. Use `aria-busy="true"` on the region. No bare spinners for layout-level loading. |
| **Empty (Zero)** | Explain what belongs here and offer a clear next action (button or link). An empty state is an invitation to act. |
| **Dense** | Survives real data: long strings (`truncate` + `title`, or `line-clamp-*`), large arrays (pagination or virtualization past about 100 rows), many badges (wrap or collapse to "+N"), and huge or tiny numbers. Test with 200-character names. |
| **Error** | Say what failed and how to fix it, plain language, no apology. Include a **Retry** action. Differentiate validation errors (inline, field-level) from connectivity errors (region-level, retryable). |

Implementation notes:

- Model state explicitly, for example `status: "loading" | "empty" | "error" | "success"`, and switch on it. Don't infer from `data?.length` scattered through JSX.
- Provide a `*.mock.ts` with fixtures for **all four states**, plus a dense fixture (long text, 500 items).
- **NEVER** ship "happy path only" components that look right with three short words of text.
- Optimistic updates roll back on failure and surface the error.
- Debounce search inputs and cancel stale requests.

### Numbers & data display

- **MUST** use `tabular-nums` on any UI showing changing numbers: prices, counters, clocks, timestamps, table numeric columns.
- Use `font-mono` for prices and identifiers where alignment matters.
- Right-align numeric columns. Keep decimal precision consistent within a column.
- Format with `Intl.NumberFormat` / `Intl.DateTimeFormat`. Never hand-roll currency or date formatting.
- Numbers that update live **MUST NOT** wobble horizontally. Reserve width (`min-w-*`) if the digit count changes.

### Layout stability

- Reserve space for everything that loads late: images get `width`/`height` or `aspect-*`, cards get skeletons of identical size, fonts use `font-display: swap` with size-adjusted fallbacks.
- Nothing may "pop in" and push existing content down.

---

## 8. Forms & Inputs

- Use `react-hook-form` + `zod` (if present). One schema drives types and validation.
- Validate on blur, re-validate on change after the first error. Never show errors before the user has interacted.
- Disable the submit button only while submitting, never as the sole way of communicating an invalid form. Show what's wrong.
- Show pending state on submit buttons (spinner plus label change), and prevent double submits.
- Preserve user input on error. Never clear a form on failure.
- Use the correct `type`, `inputMode`, and `autoComplete` attributes for each field.
- Destructive actions require confirmation via `AlertDialog`, with the action named explicitly ("Delete project", not "OK").

---

## 9. Copy & Microcopy

- Write from the end user's perspective in plain language. A user manages *notifications*, not *webhook config*.
- Use active voice and sentence case. Buttons say exactly what happens: "Save changes," not "Submit."
- Keep vocabulary consistent through a flow: the button says "Publish," the toast says "Published."
- Errors state what happened and how to fix it. They don't apologize and they aren't vague.
- Empty states name the thing and the next step: "No watchlists yet. Create one to track symbols."
- No filler, no marketing voice inside product UI, no cleverness at the expense of clarity.

---

## 10. Performance

- Use `next/image` (or equivalent) with explicit dimensions and sensible `sizes`.
- Lazy-load below-the-fold and heavy components (`dynamic` / `React.lazy`).
- Virtualize long lists (`@tanstack/react-virtual`) instead of rendering thousands of nodes.
- Memoize only when profiling or obvious re-render cost justifies it. Don't sprinkle `useMemo`/`useCallback` by default.
- No layout thrash in render: don't read layout (`getBoundingClientRect`) in render paths.
- Keep client components minimal. Default to server components where the framework supports it, and push `"use client"` to the leaves.

---

## 11. The Vibe Audit (Run Before Declaring Done)

Run this on **every** change you produce. Report results in your final message as a checklist; list failures and what you did or didn't fix. Do not claim a pass you didn't verify.

| Test | Check | Fail sign |
|---|---|---|
| **The Div Test** | Every clickable element is a real `button` / `a` | Clickable `div`/`span` without `onKeyDown` and `tabIndex={0}` |
| **The Layout Shift Test** | Late-loading content has reserved space | Images/cards that pop in and push content down; missing aspect ratios |
| **The Numerical Jitter Test** | Changing numbers use `tabular-nums` | Prices, clocks, or counters that wobble horizontally on update |
| **The Outline Test** | Focus is always visible | `outline-none` without a `focus-visible` ring |
| **The Contrast Test** | AA contrast in both themes | Muted text in dark mode below 4.5:1 on card backgrounds |
| **The 4-State Test** | Loading, Empty, Dense, Error all exist | Only the happy path is implemented |
| **The Keyboard Test** | Full flow works with keyboard only | Unreachable controls; overlays that don't trap focus or close on Esc |
| **The Token Test** | No arbitrary values or hardcoded colors | `p-[17px]`, `text-[#123456]`, `bg-white` without `dark:` |
| **The Motion Test** | Springs, tactile buttons, reduced motion honored | Linear fades, missing `useReducedMotion`, scattered entrance animations |

---

## 12. Definition of Done

A UI task is done only when **all** of these are true:

- [ ] Uses existing `@/components/ui` primitives and tokens; no arbitrary values
- [ ] Semantic HTML throughout; no clickable divs
- [ ] Loading, Empty, Dense, and Error states implemented, with mock fixtures for each
- [ ] Keyboard-operable with visible `focus-visible` rings; overlays trap focus and close on Esc
- [ ] Dark mode works; contrast meets WCAG AA in both themes
- [ ] Responsive at 360 / 768 / 1280px with no page-level horizontal scroll
- [ ] `tabular-nums` on all fluctuating numbers; no layout shift
- [ ] Springs for motion; `active:scale-[0.98]` on buttons; reduced motion respected
- [ ] TypeScript strict passes; no `any`; lint and format pass
- [ ] Vibe Audit (Section 11) run and reported
- [ ] Final message lists files changed, assumptions made, and anything left unfinished

---

## 13. Reusable Prompt Templates

Use these as the shape for requests to the agent. Fill the brackets.

### Scaffold

> Build [screen/page] using `@/components/ui/card`. Use a [3]-column grid that shifts to 1 column on mobile. The nav is `sticky top-0` with `backdrop-blur-md`. All price data uses `font-mono` and `tabular-nums`. Include a skeleton loader that matches the exact layout of the cards. Follow AGENTS.md.

### Component

> Generate an accessible Popover using Radix UI, triggered by a "Settings" button. Use semantic styling from our Tailwind theme. It must trap focus and close on Esc. Add a spring entry animation (stiffness 400, damping 30). Implement all four states if it shows data.

### Polish Pass

> Refactor the CSS transitions in `[Navigation.tsx]` to use framer-motion `LayoutGroup` with a shared layout animation instead of a linear opacity fade. Make hover states tactile with a slight scale-up. Add a `focus-visible` ring with `ring-offset-2` that stays distinct from the element border. Respect reduced motion.

### Audit

> Audit the components in `[path]` against Section 11 of AGENTS.md. Report each test as pass/fail with file and line references. Fix failures that are in scope and list the rest.

---

## 14. When to Stop and Ask

Stop and ask the human before proceeding if:

- The task needs a new dependency, a new design token, or a change to shared primitives in `@/components/ui`
- The data shape or API contract is unknown or ambiguous
- Two rules in this file conflict with the request
- A change would touch more than about 10 files
- You can't verify something (e.g. contrast, keyboard flow) and would otherwise be guessing. Say so instead of claiming it passes.
