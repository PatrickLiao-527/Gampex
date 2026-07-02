# Gampex Web

## Before any UI/frontend change

**Read `/Users/whitegx/PatOS/Gampex/DESIGN.md` first.** It defines the design system — colors, typography, spacing, component patterns, do's and don'ts. Every UI change must be consistent with it.

Key constraints from the design system:
- Monochrome palette: near-black primary (`#37352f`), warm grays, white surfaces. No blue accent.
- Color is reserved for semantic meaning only: element category dots, success/danger states.
- Surfaces use `surface` (white) on `canvas` (warm off-white `#f6f5f4`), separated by `hairline` borders and barely-there shadows — never heavy drop-shadows.
- Typography: Inter with tight negative tracking at display sizes. Weight 700 for headlines, 400 for body. No decorative fonts.
- Pill-shaped (`rounded-full`) for primary CTAs. `rounded-md` (8px) for utility buttons. `rounded-xs` (4px) for form inputs.
- Check `app/globals.css` for the actual Tailwind token names (`bg-surface`, `text-ink`, `border-hairline`, etc.).

## Stack

- Next.js (App Router) + Tailwind CSS v4 + Motion (framer-motion)
- Icons: Phosphor Icons (`@phosphor-icons/react`)
- All UI is in `components/workspace.tsx` + data in `lib/data.ts`

@AGENTS.md
