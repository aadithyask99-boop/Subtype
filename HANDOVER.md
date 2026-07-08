# Dianomi Subtype Tool — Complete Technical Handover

## Overview
This is a tool built for Aadi (Publisher Implementation Manager at Dianomi) to generate and refine CSS for Dianomi ad unit subtypes. It takes a screenshot of a Dianomi ad unit, sends it to Gemini with a comprehensive knowledge base, and generates production-ready CSS. It is deployed at https://subtype.vercel.app and the repo is https://github.com/aadithyask99-boop/Subtype.

**Stack:** Static HTML (`/public/index.html`, ~2000 lines) + two Vercel Edge Functions (`/api/generate-css.js`, `/api/refine-css.js`). No framework. No build step. Deployed via GitHub → Vercel auto-deploy.

**AI:** Google Gemini via `generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`. Key stored in Vercel env as `GEMINI_API_KEY`.

**Models available:** gemini-2.5-flash (default), gemini-2.5-pro, gemini-2.5-flash-lite, gemini-2.0-flash. Server-side allowlist validation. 2.0 Flash excluded from thinkingConfig (doesn't support it). 2.5 models get per-model thinking budgets (pro=2048, flash=1024, lite=512 for generate; halved for refine).

---

## The Dianomi DOM — NEVER CHANGES, CSS IS THE ONLY LEVER

```html
.wrapper
  └── div.line2  ← REAL heading ("Sponsored Content"). Style it. Never hide. SIBLING of .hero
  └── .dianomi-wt  ← YAC icon container (optional)
  └── #dianomi_ad_N.hero.first / .hero / .hero.last  ← #dianomi_ad_N and .hero ARE THE SAME ELEMENT
        └── .sub-line2  ← Dianomi logo. SIBLING of .subhero, NOT inside it
        └── .subhero
              └── .heading_top  ← always empty, display:none always
              └── a.dianomihref
                    └── img.png  ← the ad image, direct child of .dianomihref
                    └── .text
                          └── .dianomiHeading.heading  ← always empty, display:none always
                          └── .text .line2  ← JS-injected "Advertisement" text. ALWAYS display:none
                          └── .dianomi_provider_short  ← runtime JS injects style="display:inline" — needs display:block !important
                          └── .maintext
                          └── .action  ← always exists in DOM, empty unless Header Html fill script runs
```

### Critical selector facts — violating any of these produces silent broken output:

1. **`#dianomi_ad_1` IS `.hero` — same element.** Writing `:is(#dianomi_ad_1) .hero img` searches for `.hero` inside `#dianomi_ad_1`, which is impossible since they're the same node. This selector will never match anything. Always write `:is(#dianomi_ad_1) img` (drop `.hero`). `.dianomihref` and `.text` ARE genuine descendants, so those combinations are fine.

2. **`.text .line2` not `span.line2`.** Both are `.line2` but different elements: `div.line2` is the real heading (sibling of `.hero`), `.text .line2` is the JS-injected "Advertisement" label inside `.text`. The tag name varies — always use the position-based selector `.text .line2 { display:none }`. Never use `span.line2`.

3. **`.dianomi_provider_short { display:block !important }`** — Dianomi JS injects `style="display:inline"` at runtime, beating any non-!important rule.

4. **`.text { position:static !important }`** — Dianomi JS sometimes sets `position:absolute` on `.text` after page load, breaking flex layouts.

5. **For horizontal card grids with a heading: `div.line2 { width:100%; flex-shrink:0 }`** — without this, `.line2` is just another flex child and sits inline with the first card instead of spanning above the whole grid.

6. **For text-left, image-right layouts: use `flex-direction:row-reverse` on `.dianomihref`**, never `order:1/2` on `.text` and `.hero img`. The `order` approach creates specificity conflicts when a global `.dianomihref { flex-direction:column }` exists — the layout breaks depending on which rule wins. `row-reverse` physically reverses the DOM order (img first → goes right, .text second → goes left) with no `order` properties needed.

7. **`.hero img` not `.dianomihref img`** — use the class selector on `.hero`, not a descendant of `.dianomihref`.

8. **`.dianomihref` not `.subhero a.dianomihref`** — the short form only.

---

## Knowledge Base: dianomi-skill.md

This file is loaded at runtime by `generate-css.js` as the full system prompt. It is the primary long-term memory of the system — ~1450 lines covering:

- The DOM structure above with full reasoning
- 9 layout patterns (A–I) with production CSS examples and WHY reasoning
- Advanced techniques: `display:contents` grid-breakout for provider-as-label, pseudo-element multi-line headings, `row-reverse` for reversed lists, `:is()` grouping
- The Dianomi logo variants (small "D" icon vs full wordmark), with three position patterns including the vertically-centred banner technique (`top:50%; transform:translateY(-50%)`)
- Adaptive design / per-device breakpoint patterns
- Known gotchas with discovery context
- Breakpoint-scoped editing and Custom unit type documentation
- Preserving CSS during refine (copy-then-patch rule)

**Refine does NOT load skill.md** — `refine-css.js` has its own condensed REFINE_SYSTEM prompt with the essential rules, WHY reasoning, techniques, and the copy-then-patch methodology. Any new knowledge added to skill.md must also be added to refine-css.js if it needs to be available during refinement.

---

## Few-Shot System (generate-css.js)

The generation system uses a multi-turn Gemini conversation with 7 real screenshot+CSS pairs before the actual request. This is the most important part of the generation quality — these visual examples teach Gemini what correct Dianomi CSS looks like structurally.

**CRITICAL BUG WE FIXED AND WHY:** Originally all 7 "model" turns in the few-shot conversation included prose descriptions like `"I see a landscape single-ad unit... Here is the CSS:\n\n{CSS}"`. This taught Gemini (via in-context learning, which outweighs instruction text) that the expected response FORMAT is "description then CSS." It was producing literal prose inside CSS files. Fixed by stripping all prose from model turns — they are now **pure CSS only**, matching exactly what we want the real generation to produce. **Never add prose back to the model turns in the few-shot examples.**

### Current 7 reference examples:
1. `example-1-portrait-single.jpg` — portrait single-ad, image below text
2. `example-2-list-300x600.jpg` — 5-item list 300×600, thumbnail left
3. `example-3-landscape-970x250.jpg` — landscape single-ad, image left, text right, black CTA button
4. `example-4-heading-grid.jpg` — 2-column grid, full-width "Sponsored Content" heading (the `width:100%` rule)
5. `example-5-gift-guide.jpg` — decorative two-line heading (pseudo-element), `display:contents` grid-breakout for provider-as-label
6. `example-6-ft-hybrid-grid.jpg` — 3-column serif grid (FT style)
7. `example-7-multizone-magazine.jpg` — multi-zone magazine (PAID PARTNER CONTENT style, grey background, full Dianomi wordmark)

All reference images are JPEG at ~900px wide, ~250–500KB each (~480KB base64 total). The user's uploaded screenshot is also compressed client-side to max 1200px JPEG before sending, preventing the "Unexpected token R" payload error.

### User prompt structure (generate-css.js):
- Num Ads, Element Order, multi-ad vs single-ad hint
- 10-point visual analysis checklist (steps 0–9), including: locate the unit first within a full-page screenshot by finding "Sponsored Content/Advertisement/Around the web/Paid Content/Paid Partner Content" + Dianomi logo
- FINAL REMINDERS (the most commonly missed rules)
- `domNote` — what Header Html elements ARE and ARE NOT present for this unit
- `dimensionNote` — IAB Fixed vs Responsive behaviour requirements
- `userNoteBlock` — optional context note from the person (e.g. "there are 10 ad slots")

---

## Refine System (refine-css.js)

Single-turn Gemini call (not multi-turn — no reference images, condensed REFINE_SYSTEM inline).

### What it receives:
- `REFINE_SYSTEM` prompt (copy-then-patch methodology, rules, WHY reasoning, 3 techniques)
- `userMessage` containing: current round number, Header Html elements present, breakpoint scope note (if breakpoint reference), feedback history (last 3 rounds), num ads, element order, `[image attached]` placeholder, current CSS, user feedback

### Key features in refine-css.js:
- `logoNote` — if logo position was manually set, tells Gemini not to move it
- `dimensionNote` — IAB vs Responsive requirements for this unit size
- `historyNote` — last 3 rounds of literal feedback text (not just the resulting CSS), so Gemini understands what was asked each time
- `breakpointNote` — scoped editing instruction when this is a breakpoint-specific reference upload (see Breakpoint Reference section below)
- `breakpointDimensionNote` — forces specific width/height inside the targeted breakpoint scope, with explicit explanation that placement inside the media query matters because a downstream system extracts only what's inside that block

---

## UI Architecture (public/index.html)

The tool is a single HTML file (~2000 lines). Structure:

**Top bar:** Num Ads ±, W/H sliders, breakpoint presets (375/768/970/1460), ↺ Reset, ↓ CSS, ↓ HTML

**Preset bar:** Preset dropdown (Flex baseline / 5-image 300×600 / Landscape 970×250), Header Html toggles (Logo, YAC, Line2 + text input, Read More), Logo position (6 positions + mobile override), Maintext length, Provider length, Unit Type (IAB Fixed / Responsive / Custom), Element Order (provider,text / text,provider)

**Left panel:** Header Html editor (CodeMirror), CSS editor (CodeMirror), Generated HTML (read-only), Screenshot → CSS + Refine CSS (combined collapsible section)

**Right panel:** Reference image (shown above live preview after generation), Live Preview (iframe)

### The Refine Panel (single home for everything screenshot-related):

**State A (no CSS yet — upload state):** Dimensions (W×H + IAB presets), Unit Type, Model selector, Dropzone, optional context note textarea (shown after image upload), Generate CSS button.

**State B (after generation — refine state):** Reference thumbnail, "Upload a different reference screenshot" button, Unit Type, Model selector, Feedback textarea (Cmd+Enter), Refine CSS button, "+ Add breakpoint reference" section.

States are managed by showing/hiding `#refine-no-image` and `#refine-has-image`.

**The old modal is gone.** There is no popup modal anymore. Screenshot upload lives entirely in the Refine panel. The "✦ Screenshot → CSS" button from the top bar was removed.

---

## State Variables (top of script)

```js
var S = { numAds, widthPct, heightPx, charLen, provLen, order, unitType };
var refineRound = 0;
var lastGenWidthPx = 970, lastGenHeightPx = 250;
var pendingImageBase64, pendingMimeType;
var refineFeedbackHistory = [];  // last N rounds of literal feedback text
var bpPendingImageBase64, bpPendingMimeType, bpPendingDataUrl;
var bpSelectedTier = 'desktop';
var bpTrackedPxValues = {};    // px values protected from IAB/Responsive conversion
var bpAppliedGallery = [];     // {tier, px, dataUrl} — for gallery display
var unitTypeChangedSinceGen = false;
```

---

## Unit Type System — Three States

**CRITICAL:** `setUnitTypeUI` and `applyUnitTypePreset` MUST be top-level functions (outside DOMContentLoaded). Previously they were inside the closure, making them invisible to `applyBreakpointReference` (a top-level function), causing a `ReferenceError`. This was a critical bug that made unit type buttons stop working after applying a breakpoint reference. They are now correctly at the top level alongside `mergeBreakpointResult` and other shared functions.

### IAB Fixed
- Strips all `@media` blocks
- Sets `.wrapper { max-width: ${width}px; width: 100% }` for proportional shrinking
- Re-inserts any curated breakpoint blocks tracked in `bpTrackedPxValues` that got stripped
- Correct behaviour confirmed: stripping responsive code is exactly what IAB Fixed should do

### Responsive
- `hasSubstantialResponsiveCSS()` detection runs FIRST. If the CSS already has per-ad-slot targeting (`#dianomi_ad_N`) in any media query, or has more than 3 declarations total across media queries → it is "substantial" → leave it COMPLETELY UNTOUCHED.
- This prevents the Responsive button from overwriting good Gemini-generated responsive CSS with the local generic template
- If there's nothing substantial → runs `convertToResponsiveLocal()` which detects layout type and adds 768px + 480px breakpoints
- Re-inserts protected blocks from `bpTrackedPxValues` (same as IAB)

### Custom
- No-op. Does nothing to CSS.
- Auto-activated whenever `applyBreakpointReference()` succeeds
- Exists specifically so pressing IAB or Responsive after adding breakpoint references doesn't destroy that curated work
- The three buttons (unit-type-btns, unit-type-btns-refine, unit-type-btns-refine-2) all call the same functions

### Error handling
`applyUnitTypePreset` wraps everything in try/catch. Previously silent failures looked exactly like "button does nothing." Now surfaces a readable error message in `#refine-status`.

---

## Breakpoint Reference Feature

**Purpose:** Upload a screenshot showing how the unit should look at a specific screen size (Desktop / Tablet 768px / Mobile 480px / Custom px). Generates CSS scoped strictly to that breakpoint's media query. Multiple uploads allowed sequentially for different tiers.

**UI:** In `#refine-has-image`, "+ Add breakpoint reference" button toggles `#bp-panel`. Panel contains: tier buttons, custom px input, width×height inputs (optional), dropzone, note textarea, Apply button. After each successful apply, the uploader resets for the next one. A gallery of applied references appears below the panel with click-to-view-full-size thumbnails.

### How scope guarantee works — this is the most important design decision:

**The problem:** Prompt instructions alone don't reliably prevent Gemini from touching things outside the requested scope. Even with very strong "DO NOT touch anything outside @media(max-width:480px)" instructions, it sometimes rewrites desktop rules anyway.

**The fix — deterministic merge:** 
1. Capture `originalCssBeforeCall` BEFORE the API call
2. Stream Gemini's raw output into `cssBuffer` — NOT shown to user mid-stream
3. After streaming completes, call `mergeBreakpointResult(originalCssBeforeCall, cleanOutput, tier, breakpointPx, forceWidth, forceHeight)`
4. This extracts ONLY the in-scope portion from Gemini's output, discards everything else, merges into original
5. ONLY THEN show the result to the user

### `mergeBreakpointResult(original, geminiOutput, tier, px, forceWidth, forceHeight)`:
- **desktop tier:** Extract base rules from Gemini's output (strip all @media), keep ALL @media blocks from ORIGINAL
- **breakpoint tier:** Extract the specific `@media (max-width: ${px}px) { }` block from Gemini's output using brace-counting parser; remove any existing version of that block from original; append new block
- **dimension forcing:** `forceDimensionInBlock(mediaBlockText, width, height)` — injects `.wrapper { width:${w}px; max-width:100%; height:${h}px }` into the new block regardless of where Gemini placed the dimension rules. This was necessary because Gemini often places dimension rules at the base level (outside the media query), which the deterministic merge would then discard.

**Tested against:** a simulation where Gemini rewrote desktop `.wrapper` (flex-direction, padding) while only supposed to edit the 480px block — the merge correctly preserved original desktop rules and only accepted the mobile block changes.

### Tracking and protection:
- `bpTrackedPxValues[px] = true` set on each successful apply
- IAB and Responsive local converters re-insert these protected blocks after their own conversion
- `refineFeedbackHistory` reset on fresh screenshot upload; `bpTrackedPxValues` and `bpAppliedGallery` also reset

---

## Header Html Toggle System

Four toggles: Logo, YAC, Line2 (with text input), Read More

`rebuildHeaderFromToggles()` → calls `buildHeaderHtml(opts)` which rebuilds from scratch based on checkbox state → `setHeader()` → auto-expands Header Html section → CodeMirror refresh → `schedRender()`

**CSS sync for Line2 (`syncLine2Styling(shouldExist)`):**
- ON: inject default `.line2 { width:100%; flex-shrink:0; font-family:...; font-size:14px; ... }` and `.line2 .title { }` if no real `.line2` rule exists yet (detected by checking for `.line2 {` not preceded by `.text`)
- OFF: REMOVE the `.line2 {}` and `.line2 .title {}` rules entirely from the CSS — not `display:none`, complete deletion, so production-copied CSS has no dead rules

**CSS sync for Action (`syncActionStyling(shouldBeVisible)`):**
- ON: if `.action { display:none }` exists, replace with visible button style
- OFF: REMOVE the `.action {}` rule entirely
- `.action` is a fixed DOM element that always exists — the toggle only controls whether Header Html's script fills it with text. Without CSS removal, toggling off leaves a visible empty black box.

---

## Client-Side CSS Transformations

### `stripCssComments(css)`
Applied to all AI output at completion. Gemini doesn't reliably follow "no CSS comments" instruction, so this strips them deterministically.

### `convertToIABLocal(css, targetWidthPx)`
- Strips all @media blocks
- Adds/merges `max-width: ${width}px; width: 100%` into `.wrapper`
- Pure JavaScript, no AI call

### `convertToResponsiveLocal(css)`
Only runs if `hasSubstantialResponsiveCSS()` returns false. Detects layout type:
- `isGrid`: `.wrapper` has `flex-direction:row` → adds 768px 2-column and 480px 1-column hero rules
- `isBanner`: both `.dianomihref` AND `.text` have `flex-direction:row` → adds 480px column-flip for both, resets vertically-centred logo to `bottom:10px; transform:none`
- `isRowCard`: `.dianomihref` has `flex-direction:row` (but not banner) → adds 480px column-flip
- Multi-zone layouts (per-slot ID targeting detected) → adds consistency reset: `:is(#dianomi_ad_1, ..., #dianomi_ad_12) img { width:100% !important; height:auto !important }` at 480px

### `hasSubstantialResponsiveCSS(css)`
Returns true if any `@media` block contains `#dianomi_ad_N` selectors OR has more than 3 declarations total. Prevents Responsive button from overwriting good Gemini work.

### `mergeBreakpointResult(original, geminiOutput, tier, px, forceWidth, forceHeight)`
See Breakpoint Reference section above.

### `forceDimensionInBlock(mediaBlockText, width, height)`
Injects width/height into a specific @media block, replacing any conflicting existing values. Used to ensure breakpoint dimensions are in the right place regardless of model output.

### `resizeImageForUpload(file, callback)`
Shared between main upload and breakpoint upload. Resizes to max 1200px wide, JPEG 85%, returns `{dataUrl, base64, mimeType, width, height, sizeKB}`.

---

## Reference Image System

7 JPEG reference images at ~900px wide stored in `/api/reference-images/`. Total ~480KB base64. Loaded at module level in generate-css.js.

Reference images (original PNG sources) came from:
1. MarketWatch portrait unit (screenshot)
2. Telegraph 300×600 list (screenshot)
3. Landscape 970×250 with black CTA (screenshot)
4. "Sponsored Content" 2-column grid with full-width heading (from session — `Screenshot_2026-07-03_at_13_08_25.png` cropped)
5. Gift Guide (from session — `Gift_Guide.png`)
6. FT hybrid grid (from session — `Frame_2.png`)
7. PAID PARTNER CONTENT magazine (from session — `Group_12.png` top 35% cropped)

---

## Bugs Fixed During This Session — Reasoning for Each

### 1. Prose leaking into CSS output (CRITICAL, happened twice)
**Root cause:** Few-shot model turns had "I see a [description]... Here is the CSS:\n\n{CSS}" — teaching Gemini the wrong output format via example, which outweighs instruction text.
**Fix:** Model turns are now pure CSS only. NEVER add descriptive prose to model turns in the few-shot examples.

### 2. `#dianomi_ad_N` IS `.hero` — same element
**Root cause:** Wrote `:is(#dianomi_ad_1) .hero img` which is "img inside .hero which is inside #dianomi_ad_1" — impossible since they're the same element.
**Fix:** Always write `:is(#dianomi_ad_1) img`. Fixed 7+ occurrences across skill.md. Added explicit warning documentation.

### 3. `span.line2` → `.text .line2`
**Root cause:** Tag-dependent selector fails when Dianomi injects a different tag. The "Advertisement" label is always inside `.text` regardless of tag.
**Fix:** Use position-based `.text .line2 { display:none }`. Changed across all files.

### 4. `div.line2` sitting inline in grids
**Root cause:** `div.line2` is a sibling of `.hero` inside `.wrapper`. Without `width:100%`, it's just another flex child in a `flex-direction:row` wrapper — sits next to the first card.
**Fix:** Always add `.line2 { width:100%; flex-shrink:0 }` when `.wrapper` uses `flex-direction:row`. Documented in checklist step 3, FINAL REMINDERS, and refine prompt.

### 5. `order:1/2` for reversed list layouts
**Root cause:** When a global `.dianomihref { flex-direction:column }` rule exists, `order:2` on `.hero img` means "second from top" not "second from left." Breaks depending on specificity.
**Fix:** Use `flex-direction:row-reverse` on `.dianomihref`. This physically reverses layout without `order` properties.

### 6. `setUnitTypeUI is not defined`
**Root cause:** `setUnitTypeUI` and `applyUnitTypePreset` were defined INSIDE the `DOMContentLoaded` closure. `applyBreakpointReference` is a top-level function and couldn't see them.
**Fix:** Moved both functions to top-level scope. The crash also prevented cleanup code from running, leaving stale state.

### 7. Unit Type buttons appearing to do nothing (silent failure)
**Root cause:** `applyUnitTypePreset` had no try/catch. Any exception failed silently — no visible error, no status message, indistinguishable from "button does nothing."
**Fix:** Wrapped in try/catch with readable error surfaced in `#refine-status` + `console.error`.

### 8. Responsive button destroying Gemini-generated responsive CSS
**Root cause:** `convertToResponsiveLocal` always stripped ALL existing @media blocks first, then rebuilt from generic heuristics — with zero awareness that Gemini may have produced better work.
**Fix:** `hasSubstantialResponsiveCSS()` check runs first. If substantial work detected (per-slot targeting or >3 declarations), leaves CSS completely untouched.

### 9. Dimension inputs defaulting to 970×250 silently
**Root cause:** Fields pre-filled with `value="970"` and `value="250"`. If not overwritten, wrong unit context sent to Gemini → generates wrong layout pattern entirely.
**Fix:** Removed defaults (fields start empty). `generateCSS()` hard-blocks with visible error message until real dimensions entered.

### 10. Breakpoint scope violation (Gemini touching desktop when asked for mobile)
**Root cause:** Trusted Gemini's raw output. Used prompt instruction alone ("only touch 480px block") which isn't a hard guarantee.
**Fix:** Deterministic client-side merge. Capture original CSS before the call. After streaming, extract only the target block from Gemini's output, discard everything else, merge into original. Tested against a simulation of exactly this failure.

### 11. Breakpoint dimensions not applying
**Root cause:** Gemini placed dimension rules as base-level rules (outside the media query), which the deterministic merge then discarded since it only extracts what's inside the target block.
**Fix:** `forceDimensionInBlock()` — deterministically injects width/height into the correct block after the merge, regardless of where Gemini placed them.

### 12. IAB/Responsive buttons wiping breakpoint reference work
**Root cause:** Local converters stripped all @media blocks with no awareness of which ones were hand-curated.
**Fix:** `bpTrackedPxValues` tracks curated px values. Both converters protect and re-insert these blocks after their own work.

### 13. Mobile logo broken: toggle removes logo, can't bring back
**Root cause:** CSS comment-marker approach for removing the mobile logo block (`/* AUTO:sub-line2-mobile */`) used a regex that assumed specific indentation in the closing braces. Any indentation mismatch caused silent removal failure, then subsequent toggles stacked broken/duplicate blocks.
**Fix:** Replaced with exact JS string tracking — store the exact block text on append, remove it by literal string match.

### 14. Header Html toggle "no code change" (toggles change preview but not CSS)
**Root cause:** The Header Html CodeMirror section was collapsed. Changes happened in the editor but weren't visible. Additionally, `syncLine2Styling` and `syncActionStyling` were either not triggering or being called with wrong state.
**Fix:** `rebuildHeaderFromToggles()` now auto-expands the Header Html section and refreshes CodeMirror on every toggle. `syncLine2Styling(bool)` and `syncActionStyling(bool)` are bidirectional — called with the current state every time, removing AND adding CSS rules as needed.

### 15. Read More toggle: untoggling leaves black empty box
**Root cause:** `.action` is a fixed DOM element (always exists). On toggle OFF, the text was removed but CSS `.action { display:inline-block; background:#000 }` remained applied to an empty element.
**Fix:** `syncActionStyling(false)` now REMOVES the `.action` rule entirely from CSS. No `display:none`, no empty box — just no rule, which is functionally equivalent and keeps production CSS clean.

### 16. Payload size error ("Unexpected token R, Request En... is not valid JSON")
**Root cause:** Total request payload (7 reference images as PNG base64 + user screenshot) exceeded Gemini API limits.
**Fix:** Converted reference images from PNG to JPEG (8x smaller). Added client-side screenshot compression to max 1200px JPEG. Total reference image payload: ~480KB base64.

### 17. Model selector duplication / removal
**Root cause:** Model selector existed in 3 places (top bar, refine upload state, refine refinement state), with the top-bar one being the authoritative source but the others not synced.
**Fix:** Removed top-bar model selector. Refine panel has two synced copies (one per state). Changing either updates the other.

---

## What Gemini Does and Doesn't Learn

**Gemini does NOT learn between API calls.** There is no training happening. Each call is completely stateless. The "feedback loop" is just a multi-turn conversation within one session — Gemini can see prior exchanges within a single HTTP connection, but all context is gone when the session ends.

**The only persistent memory:** `dianomi-skill.md` (edited manually when new patterns are discovered). This is the entire long-term knowledge of the system.

**What Gemini CAN reliably do from text descriptions (because the technique is in skill.md):**
- All 9 documented layout patterns
- `display:contents` grid-breakout
- Pseudo-element multi-line headings
- `row-reverse` for reversed lists
- Logo vertical centering for inline/banner units
- Per-breakpoint genuinely different design (not just scaled)

**What still needs Refine rounds:** Publisher-specific fonts, exact pixel measurements, fine-tuned per-slot sizing in complex multi-zone layouts.

---

## Dianomi Logo — Two Variants

Both use `.sub-line2`. Differentiate by `width` on `.sub-line2 img.dianomi-lg`:

- **Small "D" icon:** `width: 14–20px; opacity: 0.5` — the standard watermark (most units)
- **Full "Dianomi" wordmark:** `width: 60–100px; opacity: 1` — prominent branding (magazine layouts, PAID PARTNER CONTENT style)

### Three position patterns:
1. **Bottom-right (most common):** `position:absolute; bottom:12px; right:12px; z-index:1`
2. **Top-right:** `position:absolute; top:16px; right:16px; z-index:1`
3. **Vertically centred in banner/inline units:** `position:absolute; right:16px; top:50%; transform:translateY(-50%); z-index:1` — required when the "D" icon appears on the same horizontal axis as the provider text. Without `transform:translateY(-50%)`, it sits at the bottom and appears misaligned. Also requires `padding-right:48px` on `.wrapper` to prevent content overlap.

---

## Layout Patterns Quick Reference

**Pattern A/B:** Portrait single-ad (image below/above text, flex-direction:column)
**Pattern C:** Landscape single-ad (image left, text right, flex-direction:row on .dianomihref)
**Pattern D:** Multi-ad list (thumbnail left, text right, flex-direction:column on .wrapper)
**Pattern E:** Horizontal grid (cards side by side, .wrapper flex-direction:row, .line2 MUST get width:100%)
**Pattern F:** Inline/contextual banner (.text has flex-direction:row with justify-content:space-between, "Ad by" before provider via ::before, logo vertically centred)
**Pattern G:** Hybrid grid + reversed list (top zone: image-column cards; bottom zone: `.dianomihref { flex-direction:row-reverse }` for text-left image-right)
**Pattern H:** Asymmetric magazine (2 large columns left + 1 compact list column right)
**Pattern I:** Multi-zone magazine (different layout per slot group, targeted by ID ranges with `:is()`)

---

## Responsive / Adaptive Design Principles

- **Responsive button** preserves existing substantial breakpoints. Only builds generic template from scratch when there's genuinely nothing there.
- **Custom unit type** means hand-curated breakpoints exist. Toggling IAB or Responsive will still run but re-inserts the curated blocks after conversion.
- **Breakpoint reference uploads** allow per-tier visual grounding — upload a mobile screenshot, get CSS scoped strictly to `@media(max-width:480px)` with guaranteed no desktop changes.
- **Per-device genuinely different design (not just scaled):** Documented in skill.md and refine prompt. Different hiding, image shapes, column counts per tier.
- **Multi-zone mobile consistency reset:** If desktop CSS has different per-zone image sizes via ID selectors, 480px breakpoint needs `:is(#dianomi_ad_1, ...) img { width:100% !important }` to prevent mixed image sizes on mobile.

---

## Things That Would Break If Changed

1. **Model turn prose** — do not add descriptive text back to the 7 few-shot model turns
2. **`setUnitTypeUI` scope** — must remain top-level, not inside DOMContentLoaded
3. **`.text .line2`** — do not revert to `span.line2`
4. **`:is(#dianomi_ad_N) img`** — do not add `.hero` between the ID and `img`
5. **`mergeBreakpointResult` not streaming to UI mid-call** — for breakpoint references, the CSS is only shown AFTER the deterministic merge, never the raw Gemini stream (which may contain out-of-scope changes)
6. **`bpTrackedPxValues` protection** — must be checked by both `convertToIABLocal` and `convertToResponsiveLocal` wrappers
7. **`width:100%` default for dim-width/dim-height** — do NOT add back; fields must start empty so users are forced to explicitly set dimensions

---

## File Map

```
/public/index.html          ~2000 lines. Everything UI-related.
/api/generate-css.js        ~700 lines. Initial generation endpoint.
/api/refine-css.js          ~316 lines. Refinement endpoint.
/api/dianomi-skill.md       ~1450 lines. System prompt knowledge base.
/api/reference-images/      7 JPEG files, ~480KB total base64.
/vercel.json                Routing + 60s function timeouts.
```

## Environment Variables (Vercel)
- `GEMINI_API_KEY` — Google Gemini API key

## Deployment
GitHub push to `main` → Vercel auto-deploys. No build step. Changes live in ~30–60 seconds.

## Repo
`https://github.com/aadithyask99-boop/Subtype` — Aadi has access, commits with a fine-grained GitHub PAT.
