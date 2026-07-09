# Dianomi Subtype Tool — Complete Technical Handover

## Overview
This is a tool built for Aadi (Publisher Implementation Manager at Dianomi) to generate and refine CSS for Dianomi ad unit subtypes. It takes a screenshot of a Dianomi ad unit, sends it to Gemini with a comprehensive knowledge base, and generates production-ready CSS. It is deployed at https://subtype.vercel.app and the repo is https://github.com/aadithyask99-boop/Subtype.

**Stack:** Static HTML (`/public/index.html`, ~2120 lines) + two Vercel Edge Functions (`/api/generate-css.js`, `/api/refine-css.js`). No framework. No build step. Deployed via GitHub → Vercel auto-deploy.

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

This file is loaded at runtime by `generate-css.js` as the full system prompt. It is the primary long-term memory of the system — ~1540 lines covering:

- The DOM structure above with full reasoning
- 10 layout patterns (A–J) with production CSS examples and WHY reasoning
- Advanced techniques: `display:contents` grid-breakout for provider-as-label, pseudo-element multi-line headings, `row-reverse` for reversed lists, `:is()` grouping, CSS Grid row-span for asymmetric height-matching (Pattern J)
- The Dianomi logo variants (small "D" icon vs full wordmark), with three position patterns including the vertically-centred banner technique (`top:50%; transform:translateY(-50%)`)
- Adaptive design / per-device breakpoint patterns
- Known gotchas with discovery context
- Breakpoint-scoped editing and Custom unit type documentation
- Preserving CSS during refine (copy-then-patch rule)

**Refine does NOT load skill.md** — `refine-css.js` has its own condensed REFINE_SYSTEM prompt with the essential rules, WHY reasoning, techniques, and the copy-then-patch methodology. Any new knowledge added to skill.md must also be added to refine-css.js if it needs to be available during refinement.

---

## Few-Shot System (generate-css.js)

The generation system uses a multi-turn Gemini conversation with 8 real screenshot+CSS pairs before the actual request. This is the most important part of the generation quality — these visual examples teach Gemini what correct Dianomi CSS looks like structurally.

**CRITICAL BUG WE FIXED AND WHY:** Originally all 7 (now 8) "model" turns in the few-shot conversation included prose descriptions like `"I see a landscape single-ad unit... Here is the CSS:\n\n{CSS}"`. This taught Gemini (via in-context learning, which outweighs instruction text) that the expected response FORMAT is "description then CSS." It was producing literal prose inside CSS files. Fixed by stripping all prose from model turns — they are now **pure CSS only**, matching exactly what we want the real generation to produce. **Never add prose back to the model turns in the few-shot examples.**

### Current 8 reference examples:
1. `example-1-portrait-single.jpg` — portrait single-ad, image below text
2. `example-2-list-300x600.jpg` — 5-item list 300×600, thumbnail left
3. `example-3-landscape-970x250.jpg` — landscape single-ad, image left, text right, black CTA button
4. `example-4-heading-grid.jpg` — 2-column grid, full-width "Sponsored Content" heading (the `width:100%` rule)
5. `example-5-gift-guide.jpg` — decorative two-line heading (pseudo-element), `display:contents` grid-breakout for provider-as-label
6. `example-6-ft-hybrid-grid.jpg` — 3-column serif grid (FT style)
7. `example-7-multizone-magazine.jpg` — multi-zone magazine (PAID PARTNER CONTENT style, grey background, full Dianomi wordmark)
8. `example-8-asymmetric-grid-span.jpg` *(added 2026-07-09)* — Pattern J: one large item + 3 stacked compact items, CSS Grid row-span (`.hero.first { grid-row: 2 / span 3 }`)

All reference images are JPEG at ~250–500KB each (~530KB base64 total). The user's uploaded screenshot is also compressed client-side to max 1200px JPEG before sending, preventing the "Unexpected token R" payload error.

### User prompt structure (generate-css.js):
- Num Ads, Element Order, multi-ad vs single-ad hint
- 11-point visual analysis checklist (steps 0–10), including: locate the unit first within a full-page screenshot by finding "Sponsored Content/Advertisement/Around the web/Paid Content/Paid Partner Content" + Dianomi logo; point 10 checks for Pattern J-style asymmetric height-matching; point 11 checks that individually-targeted selectors get re-declared at every breakpoint they need to change at
- FINAL REMINDERS (the most commonly missed rules)
- `domNote` — what Header Html elements ARE and ARE NOT present for this unit
- `dimensionNote` — IAB Fixed vs Responsive behaviour requirements, including the individually-targeted-selector breakpoint-reset rule (added 2026-07-09)
- `userNoteBlock` — optional context note from the person (e.g. "there are 10 ad slots")

---

## Refine System (refine-css.js)

Single-turn Gemini call (not multi-turn — no reference images, condensed REFINE_SYSTEM inline).

### What it receives:
- `REFINE_SYSTEM` prompt (copy-then-patch methodology, rules, WHY reasoning, 5 techniques — including Pattern J grid-span and the individually-targeted-selector breakpoint reset, both added 2026-07-09)
- `userMessage` containing: current round number, Header Html elements present, breakpoint scope note (if breakpoint reference), feedback history (last 3 rounds), num ads, element order, `[image attached]` placeholder, current CSS, user feedback

### Key features in refine-css.js:
- `logoNote` — if logo position was manually set, tells Gemini not to move it
- `dimensionNote` — IAB vs Responsive requirements for this unit size
- `historyNote` — last 3 rounds of literal feedback text (not just the resulting CSS), so Gemini understands what was asked each time
- `breakpointNote` — scoped editing instruction when this is a breakpoint-specific reference upload (see Breakpoint Reference section below)
- `breakpointDimensionNote` — forces specific width/height inside the targeted breakpoint scope, with explicit explanation that placement inside the media query matters because a downstream system extracts only what's inside that block

---

## UI Architecture (public/index.html)

The tool is a single HTML file (~2120 lines). Structure:

**Top bar:** Num Ads ±, W/H sliders, breakpoint presets (375/768/970/1460), ↺ Reset, ↓ CSS, ↓ HTML

**Preset bar:** Preset dropdown (Flex baseline / 5-image 300×600 / Landscape 970×250), Header Html toggles (Logo, YAC, Line2 + text input, Read More), Logo position (6 positions + mobile override), Maintext length, Provider length, Unit Type (IAB Fixed / Responsive / Custom / Original — see "Unit Type System — Four States + Auto-Lock" below), lock badge (click to override auto-detected lock state), Element Order (provider,text / text,provider)

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

// Added 2026-07-09 — Original/Custom master snapshots + auto-lock system (see
// "Unit Type System — Four States + Auto-Lock" below for full reasoning)
var originalCSS = '';          // frozen forever at first generation for this unit
var customCSS = '';            // rolling master — updated by Refine + hand-edits on Custom tab
var lockedUnit = false;        // true when individually-targeted selectors carry real per-slot layout differences
var manualLockOverride = null; // null = auto-detect via detectLockedUnit(); true/false = user forced it via the lock badge
```

---

## Unit Type System — Four States + Auto-Lock

**CRITICAL:** `setUnitTypeUI` and `applyUnitTypePreset` MUST be top-level functions (outside DOMContentLoaded). Previously they were inside the closure, making them invisible to `applyBreakpointReference` (a top-level function), causing a `ReferenceError`. This was a critical bug that made unit type buttons stop working after applying a breakpoint reference. They are now correctly at the top level alongside `mergeBreakpointResult` and other shared functions.

### Why this went from three states to four (2026-07-09)

The original three-state system (IAB / Responsive / Custom) had a real gap: **toggling IAB↔Responsive is a local, regex-based JavaScript transform — it never calls Gemini.** `convertToIABLocal` strips every `@media` block unconditionally with zero protection, and `convertToResponsiveLocal`'s generic fallback template has no concept of an asymmetric grid-span layout (Pattern J) or any other layout where specific slots are individually targeted (`#dianomi_ad_N`, `.first`, `.last`, `:nth-child()`). So for a unit where Gemini correctly wrote `.hero.first { grid-row: 2 / span 3 }` as part of a genuinely responsive design, clicking IAB silently deleted that media query, and clicking back to Responsive rebuilt from a media-query-less base using a converter that has never heard of grid-row spanning — permanently losing the correct work with no warning.

Making every tab read-only (an early proposal) would have fixed this, but at the cost of breaking a genuinely useful workflow: for **uniform units** (every `.hero` styled identically), freely toggling IAB↔Responsive and refining directly from whichever preset you land on works fine today and is convenient. The fix needed to protect only the cases that can actually be damaged.

### The four states

**IAB Fixed**
- Strips all `@media` blocks
- Sets `.wrapper { max-width: ${width}px; width: 100% }` for proportional shrinking
- Re-inserts any curated breakpoint blocks tracked in `bpTrackedPxValues` that got stripped
- **Uniform unit:** operates on whatever CSS is currently on screen (`getCSS()`), exactly as before — free to toggle back and forth
- **Locked unit:** always derives fresh from `customCSS` (never from whatever was last displayed, so repeated toggling can never compound), and the result is a **read-only preview** — it never writes back into `customCSS` or `originalCSS`

**Responsive**
- **Uniform unit:** `hasSubstantialResponsiveCSS()` detection runs first. If the CSS already has per-ad-slot targeting (`#dianomi_ad_N`) in any media query, or has more than 3 declarations total across media queries → "substantial" → leave it COMPLETELY UNTOUCHED. Otherwise runs `convertToResponsiveLocal()` on `getCSS()`, same as before.
- **Locked unit:** does **not** run the generic local converter at all — it can't reason about the specific grid-span geometry Gemini wrote, and running it is exactly what breaks Pattern J-style layouts. Instead it just displays `customCSS` as-is (which already IS the correct Gemini-authored responsive version) as a **read-only preview**.

**Custom**
- The only tab that is ever hand-editable or Refine-able on a locked unit. On an uniform unit it behaves as before (existing CSS preserved, freely editable).
- Defaults to a copy of `originalCSS` immediately after generation; from then on, every successful Refine call and every genuine keystroke made while Custom is active updates `customCSS`.
- Still auto-activated whenever `applyBreakpointReference()` succeeds (breakpoint-reference-curated CSS is treated as just another form of refinement into the same master).

**Original** *(new tab, 2026-07-09)*
- Read-only always, regardless of lock state — an unconditional restore point.
- Captured once, immediately after the first successful generation for a unit (or when a starter preset is loaded from the `#unit-preset` dropdown). Never overwritten again for that unit's session.
- Clicking it shows exactly what Gemini produced on the very first pass, before any refine rounds — useful if refining goes sideways and you want to start over without re-uploading the screenshot.

### Auto-lock detection — `detectLockedUnit(css)`

Runs after every generation, every refine, every breakpoint-reference merge, and on every genuine hand-edit made on the Custom tab. Heuristic, not a certainty — flags `lockedUnit = true` on either signal:

1. **Grid placement on an individually-targeted selector.** Any rule matching an individually-targeted selector (`#dianomi_ad_\d+`, `.hero.first`, `.hero.last`, `.hero:not(...)`, `.hero:nth-child(...)`, or a grouped `:is(...#dianomi_ad_\d+...)`) that also sets `grid-row`, `grid-column`, or `grid-area`. This only ever appears in genuine per-slot span/placement layouts (Pattern J and similar) — a benign rule like `.hero:not(.last) { border-bottom: 1px solid #eee }` does NOT trip this, since it has no grid-placement property.
2. **Two or more individually-targeted rules pinning different fixed widths.** e.g. a featured slot at one `width`/`flex-basis` and a compact list zone at another (Pattern H/I-style).

**Manual override:** a clickable badge (`.lock-badge`, wired to `toggleLockOverride()`) appears next to the Unit Type buttons whenever `originalCSS` exists. Shows "🔒 Per-slot layout detected" or "🔓 Uniform unit"; clicking it sets `manualLockOverride` to force the opposite state, in case the heuristic gets it wrong in either direction. `effectiveLockedUnit()` always checks the override first, falling back to the auto-detected `lockedUnit` value.

### Read-only enforcement — `applyReadOnlyState()`

Called from `setUnitTypeUI()` (so every tab switch re-evaluates it) and after every preset application. Sets `cmCSS.setOption('readOnly', ...)`:
- Always read-only on the **Original** tab, any lock state
- Read-only on **IAB**/**Responsive** only when `effectiveLockedUnit()` is true
- Never read-only on **Custom**

Also toggles a `.cm-readonly-view` class on the CodeMirror wrapper, which adds a dimmed appearance and a small "READ-ONLY PREVIEW" badge in the corner (pure CSS, see the `<style>` block) so it's visually obvious, not just functionally blocked.

### Distinguishing hand-edits from programmatic changes

The CodeMirror `change` event fires for both genuine keystrokes AND programmatic `setCSS()` calls (button clicks, streaming). Only genuine edits should ever update `customCSS`. CodeMirror tags programmatic `.setValue()` calls with `changeObj.origin === 'setValue'` — the change handler checks this and ignores those, so an IAB/Responsive-derived preview flashing onto the editor mid-stream can never be mistaken for a hand-edit and accidentally overwrite the master:

```js
cmCSS.on('change', function(instance, changeObj){
  schedRender();
  if(changeObj.origin === 'setValue') return; // programmatic — never a real hand edit
  if(S.unitType === 'custom' || !effectiveLockedUnit()){
    customCSS = getCSS();
    refreshLockState();
  }
});
```

### Refine always targets Custom on a locked unit

If the person hits Refine while looking at a read-only tab (Original/IAB/Responsive, locked case), `refineCSS()` silently switches to Custom first, applies the fix there, and shows a status line explaining why — so feedback like "fix the mobile version" can never be applied to (and lost from) a read-only preview. This also means the individually-targeted-selector responsive-reset reasoning baked into `REFINE_SYSTEM` (see "Bugs Fixed" below) always gets a fair chance to apply, since Refine only ever touches the CSS that actually has the media queries worth protecting.

### Error handling
`applyUnitTypePreset` wraps everything in try/catch. Previously silent failures looked exactly like "button does nothing." Now surfaces a readable error message in `#refine-status` + `console.error`.

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
Returns true if any `@media` block contains `#dianomi_ad_N` selectors OR has more than 3 declarations total. Prevents Responsive button from overwriting good Gemini work. Only consulted on **uniform** units now — locked units skip this check entirely and just show `customCSS` as-is (see Unit Type System above).

### `detectLockedUnit(css)` *(added 2026-07-09)*
Heuristic that flags individually-targeted layouts the local converters can't safely handle. See "Unit Type System — Four States + Auto-Lock" above for the full two-signal reasoning (grid-placement on a per-slot selector, or 2+ per-slot selectors pinning different fixed widths).

### `effectiveLockedUnit()`, `refreshLockState()`, `updateLockUI()`, `toggleLockOverride()` *(added 2026-07-09)*
Small helper cluster around the lock system: `effectiveLockedUnit()` resolves `manualLockOverride` vs the auto-detected `lockedUnit`; `refreshLockState()` re-runs detection against `customCSS` and updates the UI; `updateLockUI()` paints the `.lock-badge` elements and calls `applyReadOnlyState()`; `toggleLockOverride()` flips the manual override when the badge is clicked.

### `applyReadOnlyState()` *(added 2026-07-09)*
Sets `cmCSS`'s `readOnly` CodeMirror option based on the active tab and lock state. See Unit Type System above for exact rules. Called from `setUnitTypeUI()` so every tab switch re-evaluates it automatically — no call site needs to remember to invoke it separately.

### `mergeBreakpointResult(original, geminiOutput, tier, px, forceWidth, forceHeight)`
See Breakpoint Reference section above.

### `forceDimensionInBlock(mediaBlockText, width, height)`
Injects width/height into a specific @media block, replacing any conflicting existing values. Used to ensure breakpoint dimensions are in the right place regardless of model output.

### `resizeImageForUpload(file, callback)`
Shared between main upload and breakpoint upload. Resizes to max 1200px wide, JPEG 85%, returns `{dataUrl, base64, mimeType, width, height, sizeKB}`.

---

## Reference Image System

8 JPEG reference images stored in `/api/reference-images/`. Total ~530KB base64. Loaded at module level in generate-css.js.

Reference images (original PNG sources) came from:
1. MarketWatch portrait unit (screenshot)
2. Telegraph 300×600 list (screenshot)
3. Landscape 970×250 with black CTA (screenshot)
4. "Sponsored Content" 2-column grid with full-width heading (from session — `Screenshot_2026-07-03_at_13_08_25.png` cropped)
5. Gift Guide (from session — `Gift_Guide.png`)
6. FT hybrid grid (from session — `Frame_2.png`)
7. PAID PARTNER CONTENT magazine (from session — `Group_12.png` top 35% cropped)
8. Asymmetric grid-span, 1 large item + 3 stacked compact items *(added 2026-07-09 — `Screenshot_2026-07-09_at_12_11_31.png`, converted PNG→JPEG)*

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

## Session Log — 2026-07-09: Pattern J, Individually-Targeted-Selector Responsive Bug, Original/Custom Lock Architecture

Three connected problems, discovered and fixed in sequence over one session. Documented in full because each fix revealed the next problem, and the reasoning chain matters for anyone picking this up later.

### Problem 1 — Gemini couldn't recreate an asymmetric grid-span layout

**Symptom:** A reference screenshot showed one large ad item on the left with three compact stacked list items on the right, where the large item's height matched the combined height of the stack. Gemini kept failing to reproduce it correctly across many refine rounds.

**Diagnosis:** Checked the existing knowledge base — Patterns H and I (the closest existing patterns) both use flexbox (`flex: 1 1 Npx`) or float, and neither can make one sibling's height genuinely track several other siblings stacked in a different column, because flex items only size off their own content. Confirmed via grep that no `grid-row`/`grid-template-rows`/row-span technique existed anywhere in `dianomi-skill.md`. This wasn't Gemini failing to apply a known technique — the technique itself was missing from what it had been taught.

**Fix — Pattern J:** Added to all three knowledge files:
- `dianomi-skill.md`: new "LAYOUT PATTERN J" section with the CSS Grid row-span technique, the WHY reasoning (why flexbox structurally cannot do this), and a recognition cue (large item's edges line up with the stack's top/bottom edges)
- `generate-css.js`: the uploaded screenshot became the 8th few-shot reference example (pure CSS model turn, no prose, matching existing convention), plus checklist point 10 explicitly prompting Gemini to check for this pattern before writing CSS
- `refine-css.js`: added as technique #4 in the condensed `REFINE_SYSTEM` prompt, since Refine doesn't load `skill.md` and would otherwise never see this

### Problem 2 — the individually-targeted-selector responsive bug

**Symptom:** After Pattern J worked on desktop, the mobile/tablet breakpoints didn't get the responsive treatment — the desktop grid-span layout was showing on phone-sized viewports.

**Diagnosis:** Neither Pattern H nor Pattern I's documentation (nor anything else in the skill files) covered a general principle: whenever desktop CSS targets specific slots individually (`#dianomi_ad_N`, `.first`, `.last`, `:nth-child()`), a generic `.hero` rule inside a media query does NOT override those more-specific rules — they silently keep applying at every breakpoint. This is a general problem, not specific to Pattern J.

**Fix:** Added a MANDATORY general rule (not just a Pattern J patch) to all three files:
- `dianomi-skill.md`: new MANDATORY section with a worked wrong-vs-right example using Pattern J, and a pre-flight checklist (list every non-uniform selector, confirm each is explicitly reset per breakpoint)
- `generate-css.js`: added to both the Responsive and IAB Fixed instruction blocks (fires from first generation, not only in refine), plus checklist point 11
- `refine-css.js`: added as technique #5, triggered by feedback phrases like "mobile isn't responsive," and folded into the "always required" rule list so it applies even without that exact phrasing

### Problem 3 — the fix didn't stick after toggling IAB/Responsive

**Symptom:** After Problem 2's fix was deployed, the same unit still failed after the person toggled between IAB and Responsive.

**Diagnosis — the real root cause of the whole session:** `convertToIABLocal`/`convertToResponsiveLocal` are local, regex-based JavaScript transforms. They never call Gemini. None of the Problem 1 or Problem 2 prompt fixes could possibly apply here, because those only affect what Gemini writes — not what the toggle buttons do to CSS that already exists. Specifically:
- `convertToIABLocal` strips every `@media` block unconditionally, with zero protection for individually-targeted layouts
- `convertToResponsiveLocal`'s generic fallback template has no concept of grid-row spanning or any individually-targeted geometry, so switching back to Responsive after IAB rebuilds from a media-query-less base using a converter that has never heard of Pattern J

**Design discussion before implementing (see full conversation for the back-and-forth):** considered making every non-Custom tab read-only and AI-refinable-only, but this would have broken the genuinely useful free-toggling workflow for **uniform units**, where nothing is at risk. Converged on: protection should only activate for units that actually have something worth protecting, decided automatically per-unit.

**Fix — the auto-lock system:**
- `detectLockedUnit(css)` heuristic: flags a unit as locked if (a) any individually-targeted selector sets `grid-row`/`grid-column`/`grid-area`, or (b) two or more individually-targeted selectors pin different fixed widths
- New state: `originalCSS` (frozen at first generation, permanent restore point), `customCSS` (rolling master, updated only by Refine and genuine hand-edits on the Custom tab)
- New 4th tab, **Original**, added to all three unit-type button groups in `index.html`
- On **uniform** units: all four tabs behave as before — freely editable, freely refinable, IAB/Responsive operate on whatever's currently displayed
- On **locked** units: Original/IAB/Responsive become read-only (enforced via CodeMirror's `readOnly` option + a visual `.cm-readonly-view` treatment); IAB always freshly derives from `customCSS`; Responsive just shows `customCSS` as-is (since it's already the correct Gemini-authored version — the generic converter is what breaks it); only Custom is editable/refinable
- `refineCSS()` auto-redirects to the Custom tab first if Refine is triggered while viewing a read-only tab on a locked unit, so feedback can never be silently lost against a preview
- A clickable lock badge (`toggleLockOverride()`) lets the person force-override the heuristic in either direction if it ever misfires
- CodeMirror's `changeObj.origin === 'setValue'` is used to distinguish genuine keystrokes from programmatic `setCSS()` calls, so button-driven preset changes can never be mistaken for hand-edits and corrupt the master

**Net effect:** toggling between IAB/Responsive/Original/Custom can no longer destroy work on units where it matters, without taking away the free-toggling convenience on units where it doesn't.

---

## Session Log — 2026-07-09 (continued): Header Html custom-script preservation — attempted, reverted

**Context:** while testing a hand-written infinite-scroll carousel script pasted directly into Header Html, discovered that `rebuildHeaderFromToggles()` completely overwrites Header Html (`setHeader(buildHeaderHtml(opts))`) any time a Logo/YAC/Line2/Action toggle changes, with zero awareness of hand-added content — silently deleting any custom script pasted in there.

**Attempted fix:** added `extractCustomScripts(headerHtml)` — a regex-based scan (`/<script[^>]*>[\s\S]*?<\\?\/script>/gi`) that finds any `<script>` block NOT matching the tool's own `ACTION_SCRIPT`, and re-appends those blocks after `rebuildHeaderFromToggles()` rebuilds the header from scratch.

**Result: broke the tool.** Shortly after this went live, the CSS editor panel started displaying a large block of literal JavaScript source text (client-side function code — `extractCustomScripts`, `applyUnitTypePreset`, `convertToIABLocal`, `convertToResponsiveLocal`, etc.) instead of actual CSS. Confirmed via incognito window that it wasn't a browser cache issue.

**Investigation (inconclusive on exact mechanism, but conclusive on the fix):**
- Checked the live GitHub source directly — no duplicated code, no function body accidentally living inside a string constant anywhere (`grep -c` confirmed every affected function appears exactly once, as real code)
- Checked `vercel.json` routing — `/api/(.*)` and `/(.*)` are correctly separated, ruled out API calls accidentally being routed to serve `public/index.html`'s raw contents
- Checked the raw `<textarea id="ta-css">` markup — confirmed empty, ruled out a static-HTML source of the garbled content
- **Did not** get to see actual browser console errors before the person asked to revert, so the precise runtime mechanism that caused the garbled CSS panel is still unconfirmed
- **Reverting the fix resolved the issue** — confirms the custom-script preservation change was the cause, even without a fully diagnosed mechanism. Revert was a clean, complete rollback (verified: the reverted file's git SHA exactly matches the pre-fix commit, `01dbcc4341`, so nothing else was altered in the process)

**Current status: reverted, NOT implemented.** `rebuildHeaderFromToggles()` is back to its original behavior — it silently overwrites Header Html on every toggle change, exactly as it did before this session. The underlying problem (hand-added scripts in Header Html get silently deleted on any toggle click) is UNFIXED and still real.

**For whoever picks this up next:** don't just re-apply the same `extractCustomScripts` regex-based approach without first understanding why it broke the CSS panel — the two features (Header Html content and the CSS editor) shouldn't have any code path connecting them, which is exactly why the failure mode was so surprising and worth investigating properly before a second attempt, rather than assuming it was a fluke. Worth getting actual browser console output during the failure state before trying again, and possibly worth testing the regex change in isolation (e.g. via `node -e` against a captured sample of the actual Header Html content) before wiring it back into the UI.

**Workaround in the meantime:** don't click any Header Html toggle after pasting a custom script — set toggles first, paste the script last, and leave toggles untouched afterward. If a toggle must change, re-paste the script manually afterward.

**Decision (2026-07-09):** after a further scrolling glitch observed while testing, decided to pause all Header Html JavaScript work for now — this includes both the custom-script preservation fix above AND the seamless infinite-scroll carousel script (DOM-cloning approach) explored earlier in this session. Neither is in active use. **The pure-CSS scroll-snap carousel (peek carousel, no JS, `.wrapper`/`.hero` only) is unaffected by this pause and remains the active direction** — it never touched Header Html or any script, so it carries none of this session's risk.

---

## What Gemini Does and Doesn't Learn

**Gemini does NOT learn between API calls.** There is no training happening. Each call is completely stateless. The "feedback loop" is just a multi-turn conversation within one session — Gemini can see prior exchanges within a single HTTP connection, but all context is gone when the session ends.

**The only persistent memory:** `dianomi-skill.md` (edited manually when new patterns are discovered). This is the entire long-term knowledge of the system.

**What Gemini CAN reliably do from text descriptions (because the technique is in skill.md):**
- All 10 documented layout patterns (A through J)
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
**Pattern J** *(added 2026-07-09)**:* Asymmetric grid-span — one large item (image-above-text) beside N smaller items stacked in a column, where the large item's height visually matches the combined height of the stack. Requires CSS Grid, not flexbox — flexbox items cannot be locked to match the combined height of several siblings in a different column. `.wrapper { display:grid; grid-template-columns:1fr 2fr }`, first `.hero` gets `grid-column:1; grid-row:2 / span N`, remaining `.hero` elements get only `grid-column:2` and auto-place into rows 1..N. Recognise from a screenshot when one clearly taller item sits beside a column of smaller evenly-stacked rows whose top/bottom edges line up with the large item's. Full worked example and 8th few-shot reference image in `dianomi-skill.md`.

---

## Responsive / Adaptive Design Principles

- **Responsive button** preserves existing substantial breakpoints on uniform units. Only builds generic template from scratch when there's genuinely nothing there. On locked units (see Unit Type System above) it doesn't run the generic converter at all — shows Custom as-is instead.
- **Custom unit type** is the live master — hand-curated breakpoints and Refine output live here. Toggling IAB or Responsive on a uniform unit still re-inserts `bpTrackedPxValues`-curated blocks after conversion, same as before; on a locked unit, IAB/Responsive are read-only previews that never touch Custom at all.
- **Breakpoint reference uploads** allow per-tier visual grounding — upload a mobile screenshot, get CSS scoped strictly to `@media(max-width:480px)` with guaranteed no desktop changes.
- **Per-device genuinely different design (not just scaled):** Documented in skill.md and refine prompt. Different hiding, image shapes, column counts per tier.
- **Multi-zone mobile consistency reset:** If desktop CSS has different per-zone image sizes via ID selectors, 480px breakpoint needs `:is(#dianomi_ad_1, ...) img { width:100% !important }` to prevent mixed image sizes on mobile.
- **MANDATORY — resetting individually-targeted selectors at every breakpoint** *(added 2026-07-09)*: whenever desktop CSS gives specific slots different treatment via `#dianomi_ad_N`, `.first`, `.last`, `:nth-child()`, or a grouped `:is(...)` selector, a generic `.hero` rule inside a media query does **not** override those rules — they carry higher specificity and silently keep applying. This is the single most common cause of "looked right on desktop but broke on mobile." The exact same individually-targeted selector must be explicitly re-declared inside every breakpoint where its properties need to change. This is now baked into `dianomi-skill.md` (MANDATORY section, worked Pattern J example), `generate-css.js` (Responsive and IAB Fixed instruction blocks, checklist point 11), and `refine-css.js` (technique #5 + the always-required rule list) — see "Bugs Fixed" below for the full discovery/fix history.
- **Toggling is local JS, not AI** — worth remembering when debugging: `convertToIABLocal`/`convertToResponsiveLocal` never call Gemini. Every prompt-level fix above only affects what Gemini writes during Generate/Refine; it has zero effect on what the toggle buttons do to CSS that already exists. This is why the auto-lock system exists — it's the only thing that actually prevents the local converters from silently destroying individually-targeted layouts.

---

## Things That Would Break If Changed

1. **Model turn prose** — do not add descriptive text back to the 8 few-shot model turns
2. **`setUnitTypeUI` scope** — must remain top-level, not inside DOMContentLoaded
3. **`.text .line2`** — do not revert to `span.line2`
4. **`:is(#dianomi_ad_N) img`** — do not add `.hero` between the ID and `img`
5. **`mergeBreakpointResult` not streaming to UI mid-call** — for breakpoint references, the CSS is only shown AFTER the deterministic merge, never the raw Gemini stream (which may contain out-of-scope changes)
6. **`bpTrackedPxValues` protection** — must be checked by both `convertToIABLocal` and `convertToResponsiveLocal` wrappers
7. **`width:100%` default for dim-width/dim-height** — do NOT add back; fields must start empty so users are forced to explicitly set dimensions
8. **`originalCSS`/`customCSS` write boundary** *(added 2026-07-09)* — only two things may ever update `customCSS`: a successful Refine response, and a genuine hand-edit (`changeObj.origin !== 'setValue'`) made while the Custom tab is active. IAB, Responsive, and Original must NEVER write to `customCSS` or `originalCSS` under any circumstance — that guarantee is the entire point of the lock system. If this is ever violated, toggling can silently destroy work again exactly like before the fix.
9. **`applyReadOnlyState()` call from `setUnitTypeUI()`** *(added 2026-07-09)* — must stay wired so every tab switch re-evaluates read-only state. If a new code path calls `setCSS()` + changes `S.unitType` without going through `setUnitTypeUI()`, the editor's readOnly flag can go stale and a locked tab could become editable.
10. **Refine's auto-redirect to Custom on locked units** *(added 2026-07-09)* — in `refineCSS()`, the check `if(effectiveLockedUnit() && S.unitType !== 'custom')` must run before the API call is made. Removing it would let feedback be sent against a read-only IAB/Responsive preview, which would either silently do nothing useful or (worse) get applied somewhere the person didn't intend.
11. **`changeObj.origin === 'setValue'` check in the CodeMirror change handler** *(added 2026-07-09)* — this is what stops IAB/Responsive/Original's programmatic `setCSS()` calls from being mistaken for hand-edits and corrupting `customCSS`. Do not remove or weaken this check.

---

## File Map

```
/public/index.html          ~2120 lines. Everything UI-related, including the Original/Custom/lock system.
/api/generate-css.js        ~725 lines. Initial generation endpoint, 8 few-shot reference examples.
/api/refine-css.js          ~325 lines. Refinement endpoint.
/api/dianomi-skill.md       ~1540 lines. System prompt knowledge base, Patterns A–J.
/api/reference-images/      8 JPEG files, ~530KB total base64 (example-1 through example-8-asymmetric-grid-span).
/vercel.json                Routing + 60s function timeouts.
/HANDOVER.md                This file.
```

## Environment Variables (Vercel)
- `GEMINI_API_KEY` — Google Gemini API key

## Deployment
GitHub push to `main` → Vercel auto-deploys. No build step. Changes live in ~30–60 seconds.

## Repo
`https://github.com/aadithyask99-boop/Subtype` — Aadi has access, commits with a fine-grained GitHub PAT.
