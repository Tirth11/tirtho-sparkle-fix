## Problems

1. **Model picker / header overlapping chat content**
   The chat header uses `flex-wrap` plus a right-side `flex flex-col` that stacks the ModelPicker trigger, a "changed Xs ago · email" subtitle, a credits pill, and (in guest mode) Log in / Sign up buttons. On a ~700px viewport everything wraps, the right column gets very tall, and the long subtitle/email pushes the header into multiple rows. The semi-transparent `bg-background/80 backdrop-blur` background then visually bleeds onto the first chat bubble, which reads as "model picker overriding the chat response". The Radix popover for the ModelPicker also has no explicit `z-index`, so on smaller screens it can render under sibling layers.

2. **Whole page scrolls instead of the chat area being static**
   The ChatWindow root sets `className="flex h-full min-h-0 flex-col"` and then *overrides* it with an inline `style={{ height: "calc(100% - var(--kb-inset, 0px))" }}`. Inline style wins over Tailwind, so `h-full` is dropped and the element computes its height from `calc(100% - 0px)` against `<main>`. When `<main>` (which is only `flex-1 min-h-0`, no explicit height) can't resolve a percentage cleanly on some browsers, the chat container grows with its content instead of clipping, the inner `overflow-y-auto` region never activates, and the whole document scrolls. That also makes the "stuck after 2-3 chats" symptom: as messages accumulate, the page expands and the input/header scroll off.

## Fix Plan (UI only)

### `src/components/ChatWindow.tsx`

1. **Stabilize the outer height**
   - Drop the inline `height: calc(100% - var(--kb-inset))` trick.
   - Keep `h-full min-h-0 flex flex-col` and instead apply the keyboard inset as `paddingBottom: var(--kb-inset, 0px)` on the **composer container** (the bottom `<div>` with the form). This keeps the flex column constrained to the parent height and lets `overflow-y-auto` on the scroll region do its job.

2. **Header: one row, no wrap, no overlap**
   - Remove `flex-wrap` from the header; add `min-h-[3.25rem]` so it never collapses.
   - Give the header `relative z-20` so it sits above the scroll region (and the backdrop blur stops bleeding into bubbles).
   - Replace the right-side `flex flex-col items-end` with a single-row `flex items-center gap-2 min-w-0` containing only: credits pill (hidden `sm:inline-flex` already), ModelPicker, and guest buttons.
   - Move the "changed Xs ago · email" subtitle out of the header into a small, dismissible-on-mobile line **below** the header (its own thin row with `hidden sm:flex`), so it stops fighting the picker for horizontal space. Keep all `data-testid` attributes intact so `e2e/model-indicator.spec.ts` still passes.
   - Constrain the ModelPicker trigger: wrap it in `<div className="min-w-0 max-w-[60vw] sm:max-w-xs">` so the dropdown label truncates instead of expanding the header.

3. **Scroll region stays static**
   - On the scroll `<div ref={scrollRef}>` add `overscroll-contain` so any rubber-band scroll doesn't propagate to the document.
   - Keep `min-h-0 flex-1 overflow-y-auto` as-is.

### `src/components/ModelPicker.tsx`

4. **Pop the dropdown above everything**
   - Add `z-50` to the popover/content element so it can't be visually covered by the chat scroll area on mobile widths. (One-line change; no behavioral change.)

### `src/routes/index.tsx`

5. **Lock the page shell**
   - On the outer flex container, keep `h-dvh overflow-hidden` and additionally set `overflow-hidden` on `<main>` so a brief layout glitch in a child can't make the document itself scroll.

## Out of scope

- No changes to streaming, worker, virtualization, persistence, or chat transport — only the layout / z-index / overflow rules described above.
- No changes to colors, typography, or the ModelPicker's content/list.

## Verification

- Resize the preview to ~700px and confirm: header is a single row, ModelPicker label truncates, chat bubbles are not visually under the header blur.
- Send 5+ messages in a row and confirm only the inner chat region scrolls; the header, composer, and document body stay fixed.
- Open the ModelPicker dropdown on mobile width and confirm it floats over the chat region.
- Run `e2e/model-indicator.spec.ts` — selectors (`model-changed-indicator`, `model-changed-tooltip`, etc.) are preserved.
