# Gampex Design System

Notion-style, monochrome, calm. Color is rare and meaningful. This file is the
source of truth for interaction states so new components don't drift. When you add
a component, match these patterns. When a pattern proves wrong, fix it here.

## Tokens (see `app/globals.css`)

- Surfaces: `surface` #fff · `canvas` #f6f5f4 · `canvassoft` #fbfbfa
- Text: `ink` #1a1a1a · `ink2` #31302e · `muted` #615d59 · `faint` #a39e98
- Lines: `hairline` #e6e6e6 · `hair2` #f0efee
- Accent (monochrome): `primary` #37352f (near-black) · `primary2` #1a1a1a · `tint` #ecebe8 (selection) · `tintborder` #e0ded9
- Meaningful color only: element categories (`srcai`/`srccg`/`srcgp`/`srcvo`), `pass` (success), `reject` (danger), `modified` (amber).

**No blue accent.** Primary buttons are near-black; selection is warm gray. Don't
introduce a colored accent for chrome, links, focus rings, or selected states.

## Hover & interaction states (the standard)

Every interactive element MUST have a visible hover and `transition-colors` (or
`transition-all` when it also moves). Pick the row that matches the element:

| Element | Rest | Hover | Active |
|---|---|---|---|
| **Icon button** (ghost) | `text-faint` / `text-muted` | `hover:bg-hair2 hover:text-ink2` | — |
| **Destructive icon button** | `text-faint` | `hover:bg-[#fdeee6] hover:text-reject` | — |
| **Secondary / outline button** | `border-hairline bg-surface` | `hover:bg-canvas` | `active:scale-[0.97]` |
| **Primary button** | `bg-primary text-white` | `hover:bg-primary2` | `active:scale-[0.97]` |
| **Dark pill** (on light bg) | `bg-ink text-white` | `hover:bg-[#383838]` (lighten) | `active:scale-95` |
| **List / table row** | transparent | `hover:bg-canvas` | — |
| **Selected row / segment** | `bg-tint` (no hover change) | — | — |
| **Dashed / add affordance** | `border-dashed border-hairline text-faint` | `hover:border-[#cdd6e0] hover:text-ink2` | — |
| **Thumbnail / media** | `ring-1 ring-hairline` | `hover:ring-2 hover:ring-ink2` | `active:scale-[0.98]` |
| **Text link** | `text-primary` | `hover:underline` | — |

Rules:
- A dark surface lightens on hover; a light surface darkens (to `canvas`/`hair2`). Never `hover:opacity-90` as the only signal — it reads as "nothing happened".
- Selected state is `bg-tint` and does not also change on hover (it's already chosen).
- Always include `transition-colors`. Movement (`scale`) is for press feedback, not hover.

## Tooltips

Use the `Tooltip` component (`components/workspace.tsx`) for every icon-only or
ambiguous control. **Never** use the native `title=` attribute — it's unstyled,
slow, and inconsistent across the app.

- Dark pill, portal-rendered (never clipped by `overflow-hidden` ancestors), 180ms open delay, instant close, keyboard-focus aware.
- `side="top"` by default; `side="bottom"` when the trigger is near the top edge.
- For an absolutely-positioned trigger, pass the position to the Tooltip anchor via `className` (e.g. `className="absolute top-2 left-2 inline-flex"`) and make the inner button static.

## Segmented controls

iOS-style: a `bg-canvas` track with `p-0.5`, each option a `rounded-md` button.
Selected = `bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]`;
unselected = `text-muted hover:text-ink2`. This is the same paradigm as the top
`Tabs`. Use it for small discrete choices (duration, mode, resolution).

## Parameter IA — prompt is primary, params are secondary

The text prompt is the hero of any generation surface: big, first, always visible.
Generation parameters are mostly "set once, rarely touch" — they do NOT deserve
permanent screen space. Collapse them into a compact control bar of chips that open
popovers (the 即梦 / LiblibAI pattern):

- **格式 chip** → popover with aspect (visual tiles) · resolution · duration · audio.
- **运镜 chip** → a selectable toggle-list popover (one camera move per row).
- **更多 chip** → popover with the rarely-adjusted rest (mode, creativity, seed, negative prompt…).
- The model selector sits in the same bar as a compact chip.

Rule of thumb: if a control is adjusted on most generations, it earns a spot in the
bar's summary; if it's a once-in-a-while tweak, it lives inside a popover. Never lay
all params out flat — it buries the prompt.

## Layout stability — content must never resize its container (FORBIDDEN)

A control must NOT change size when its text, value, or state changes. A chip that
grows from `5s` to `10s`, a button that widens from `生成` to `重新生成`, a number that
shifts as it counts — all forbidden. They cause jitter and reflow, and they look
cheap. Reserve space for the longest content up front.

Techniques (use the lightest one that fully removes the shift):
1. **`tabular-nums`** on every number that changes (counts, durations, prices, timers). Equal-width digits stop same-digit-count changes (5→8) from shifting.
2. **Fixed-width value slots** for values whose *character count* changes (`5s`↔`10s`, `720P`↔`1080P`, `9:16`↔`1:1`). Wrap the value in `inline-block text-center` with a `min-width` sized to the longest value. See `SLOT_W` in `workspace.tsx` and the slider readouts (`w-12 text-right`).
3. **`min-width` on state-labeled buttons** sized to the longest label (e.g. the generate button reserves width for `重新生成成片` so it doesn't grow from `生成成片`).
4. **Don't put appear/disappear text in a fixed bar.** If a value is optional (audio on/off), show it with a constant-footprint icon or keep it in the popover — never as text that pops in and out and reflows neighbors.

Rule of thumb: if a value can change, the space it occupies must not. When you add any
control with dynamic content, ask "what's the widest this can get?" and reserve it.

## Action button order

Secondary / dismiss actions go on the **left**; the primary action goes on the
**right** (standard dialog order). E.g. `忽略方案` left, `生成成片` right, with feedback
and adjacent options clustered next to the primary on the right.

## Confirm before irreversible actions

Anything that destroys user data (delete a shot, etc.) goes through `ConfirmModal`,
never a one-click action. Backend-only bookkeeping (e.g. "modified" tracking) does
not surface in the UI.
