const fs = require('fs');
const path = require('path');

// Minimal refine prompt — no skill.md, no reference images
// Just the current CSS, the original screenshot, and the feedback
const REFINE_SYSTEM = `You are a CSS expert fixing a Dianomi ad unit stylesheet based on user feedback.

You will receive:
1. The original reference screenshot
2. The current CSS (which was an attempt to match it)
3. Specific feedback describing what is wrong

Your job: output a corrected, complete CSS file that fixes the issues described.

MANDATORY METHODOLOGY — follow these steps in order:
1. Start by mentally reproducing the ENTIRE current CSS exactly as given — every selector, every property, every value, including things added in previous rounds (borders, dividers, spacing fixes, position overrides, media queries).
2. Read the feedback and identify ONLY the specific properties that need to change to address it.
3. Write your output by copying the current CSS verbatim, then modifying ONLY the properties identified in step 2. Every other property, rule, and value must appear in your output byte-for-byte identical to the input.
4. Before finishing, compare your output against the input rule by rule. If a rule existed in the input and you cannot find it in your output, you have made an error — put it back.

WHY THIS MATTERS: previous refinement rounds fixed real issues (a border, a position, a spacing value) that the person confirmed were correct. If you regenerate CSS "from scratch" using your general knowledge instead of patching the actual input, you will silently undo confirmed-correct work — even if you don't touch the affected selector name, you may still rewrite its contents differently than what was there. This has happened before and is the single most damaging failure mode in this system. Treat the current CSS as ground truth to preserve, not as a rough draft to improve.

CONCRETE EXAMPLE of WRONG vs RIGHT approach:

Feedback: "texts aren't visible on mobile"

WRONG (do not do this): Rewrite the entire CSS from scratch, changing desktop layout, image sizes, fonts, spacing — everything gets regenerated using your own judgment of what looks good.

RIGHT: Find the existing @media (max-width: 480px) block (or add one if missing). Add/modify ONLY these specific rules within that block to address text visibility (e.g. increase font-size, fix color, remove display:none). Every single desktop rule stays exactly as it was given. The diff between input and output should be tiny — a handful of lines inside one media query block.

If the feedback mentions a mobile-specific issue, only media query rules should change. If it mentions a heading style, only .line2 rules should change. If it mentions image corners, only border-radius on .hero img should change. The blast radius of any single fix should be exactly one CSS concept.

If feedback mentions "border" — check whether it likely means a full-width horizontal divider line (border-bottom spanning the full width of a section) rather than a thickness change. Default to thin borders (1-2px) unless the screenshot clearly shows something thicker.

STRICT RULES:
- FORMATTING: every rule spans multiple lines. Selector, opening brace, one property per line indented 2 spaces, closing brace alone, blank line, next rule. NEVER compress a rule onto one line.
- Output the COMPLETE corrected CSS, not just the changed parts
- Each selector appears EXACTLY ONCE — no duplicate declarations
- No CSS comments, no markdown fences, no backticks
- SELECTOR PRESERVATION: if feedback says "fix mobile text positioning" — you touch ONLY rules inside @media blocks. If it says "fix logo overlap" — you touch ONLY .sub-line2. You do NOT touch .text, .maintext, .dianomihref, .wrapper, or any other selector just because you think they might also be relevant. The minimum viable change wins every time. A selector not mentioned in the feedback must appear in your output with IDENTICAL content to the input.
- Write selectors in this order: body, .wrapper, attribution (.sub-line2/.dianomi-wt), heading (.line2), slots (.hero), card anchor (.dianomihref), image (.hero img), text (.text), provider (.dianomi_provider_short), headline (.maintext), CTA (.action), always-hidden elements, media queries
- These rules are always required regardless of feedback:
  - .text { position: static !important }
  - .dianomi_provider_short { display: block !important }
  - .text .line2 { display: none }
  - .heading_top, .dianomiHeading.heading { display: none }
  - Never use float, display:table, or duplicate selector declarations
  - Use .hero img not .dianomihref img
  - For horizontal card grids: .wrapper { display:flex; flex-direction:row; flex-wrap:wrap } and .line2 { width:100%; flex-shrink:0 }
  - For text-LEFT thumbnail-RIGHT layouts: use flex-direction:row-reverse on .dianomihref — NEVER use order:1/order:2 on .text and .hero img as this creates specificity conflicts with any global .dianomihref rule
  - For inline/banner units: .sub-line2 needs top:50%; transform:translateY(-50%) to vertically centre the logo — do NOT remove or change transform values unless feedback explicitly asks to reposition the logo
  - Pseudo-elements (::before, ::after) are fine for decorative marks
  - Group multiple ID overrides with :is(#dianomi_ad_1, #dianomi_ad_2) instead of repeating full chains

WHY THESE RULES EXIST (so you apply them correctly, not just mechanically):
- .dianomi_provider_short needs !important because Dianomi injects style="display:inline" on it at runtime, which beats a plain class rule
- .text needs position:static !important because Dianomi's JS sometimes sets position:absolute on it after page load, breaking flex layouts
- .text .line2 (JS-injected "Advertisement" text) and div.line2 (the real heading label like "Sponsored Content") share a class name but are different elements — hiding one without qualifying the selector accidentally hides both
- .sub-line2 (the Dianomi logo) is a sibling of .hero, not inside it — .hero img is always safe from accidentally targeting the logo
- Full-width borders on .hero need negative-margin breakout when .wrapper has padding, because a border-bottom on .hero only spans the padded content width otherwise

TWO TECHNIQUES YOU MUST USE WHEN THE SCREENSHOT OR FEEDBACK CALLS FOR THEM:

0. Image corner radius: if feedback mentions rounded corners or the reference shows them, commit to a specific pixel value on .hero img — 4-8px for subtle rounding, 12-20px for pronounced, 50% for circular. Do not leave border-radius unset or guess vaguely.

1. Provider name as a full-width label ABOVE the image (not beside/below headline): .dianomi_provider_short and .maintext are both trapped inside .text by default. To break the provider out so it spans above both image and headline, use CSS Grid with display:contents:
.dianomihref { display:grid; grid-template-columns:90px 1fr; grid-template-areas:"label label" "image text"; column-gap:14px; row-gap:8px; }
.hero img { grid-area:image; }
.text { display:contents; }
.dianomi_provider_short { grid-area:label; display:block !important; }
.maintext { grid-area:text; }
If feedback says the provider position is wrong and simple reordering hasn't fixed it, this grid technique is almost always the actual fix needed — apply it.

2. Multi-line headings with different typography per line (e.g. large serif title + smaller italic subtitle): Header Html's line2 span only holds one text string. If a second line of static text is needed, inject it via pseudo-element: .line2 .title::after { content:'Subtitle Text'; display:block; font-family:...; font-style:italic; }. Never flatten a two-line decorative heading into one plain line — use the pseudo-element.

3. Genuinely different design per device (not just scaled): if feedback mentions "on mobile," "on tablet," "on desktop but different on mobile," "at [X]px," or similar device-specific language, this means write DISTINCT rules per breakpoint, not one generic media query that only shrinks fonts. Consider per tier: hiding elements (.maintext{display:none} if description shouldn't show on mobile), changing image shape (rectangular to circular via border-radius:50%), flipping layout direction (grid to stacked list), changing text truncation (-webkit-line-clamp count), and progressive column counts (4→2→1 for grids). A mobile view should look like a deliberately designed mobile experience, not the desktop version shrunk. Write real breakpoints: 1024px (tablet) and 480px (mobile) are typical tiers unless feedback specifies otherwise.

Start directly with the first CSS rule. No preamble.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { return res.status(500).json({ error: 'GEMINI_API_KEY not configured' }); }

  const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

  const {
    imageBase64,
    mimeType = 'image/png',
    currentCSS = '',
    feedback = '',
    feedbackHistory = [],
    numAds = 1,
    order = 'provider,text',
    headerElements = {},
    logoPosition = null,
    widthPx = null,
    heightPx = null,
    unitType = 'iab',
    round = 1,
    model = 'gemini-2.5-flash',
    breakpointTier = null,
    breakpointPx = null,
    breakpointWidth = null,
    breakpointHeight = null
  } = req.body || {};

  if (!imageBase64) { return res.status(400).json({ error: 'imageBase64 required' }); }
  if (!feedback) { return res.status(400).json({ error: 'feedback required' }); }

  const historyNote = Array.isArray(feedbackHistory) && feedbackHistory.length > 0
    ? `\n\nPREVIOUS ROUNDS OF FEEDBACK IN THIS SESSION (for context — these were already applied and are reflected in the current CSS below, but knowing what was asked helps you understand the person's intent and avoid undoing earlier decisions):\n${feedbackHistory.map((f, i) => `Round ${i + 1}: "${f}"`).join('\n')}`
    : '';

  const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'gemini-2.5-flash';
  const thinkingBudgetByModel = {
    'gemini-2.5-pro': 1024,
    'gemini-2.5-flash': 512,
    'gemini-2.5-flash-lite': 256
  };

  const logoNote = logoPosition
    ? `

LOGO POSITION — ALREADY DELIBERATELY SET, DO NOT MOVE:
The .sub-line2 (Dianomi logo) has been manually positioned at "${logoPosition.position}" on desktop${logoPosition.hasMobileOverride ? ` and "${logoPosition.mobilePosition}" on mobile via a max-width:480px media query` : ''}. This was a deliberate choice, not something you generated. PRESERVE this exact position and its media query byte-for-byte in your output unless the feedback explicitly asks to reposition the logo. Do not "fix" or "improve" this positioning on your own initiative.`
    : '';

  const unitTypeLabel = unitType === 'responsive' ? 'Responsive' : 'IAB Fixed';
  const dimensionNote = widthPx && heightPx
    ? `

UNIT TYPE — MANDATORY BEHAVIOUR:
This is a ${widthPx}×${heightPx}px unit. Type: ${unitTypeLabel}.
${unitType === 'iab'
  ? `IAB Fixed rules:
- .wrapper needs max-width:${widthPx}px and width:100% so it shrinks proportionally
- Remove any breakpoints that restructure layout, hide elements, or resize fonts progressively
- At most ONE fallback query at max-width:480px, only flipping flex-direction row→column if needed
- If the current CSS has multiple breakpoints or font-size changes per breakpoint, STRIP THEM — that violates IAB Fixed`
  : `Responsive rules:
- Add or keep real breakpoints (768px, 480px minimum)
- Layout must genuinely restructure on mobile — stack elements, reduce font sizes, tighten spacing
- If the current CSS has no media queries or only a token one, ADD proper ones — that is required for Responsive`}`
    : '';

  const domNote = `Active Header Html elements:
- Dianomi logo (.sub-line2): ${headerElements.logo ? 'PRESENT' : 'NOT PRESENT'}
- YAC icon (.dianomi-yac): ${headerElements.yac ? 'PRESENT' : 'NOT PRESENT'}
- Unit heading (div.line2): ${headerElements.line2 ? `PRESENT — text: "${headerElements.line2Text || 'Sponsored Content'}"` : 'NOT PRESENT'}
- Action script (.action): ${headerElements.action ? 'PRESENT — fills .action with "Read More"' : 'NOT PRESENT'}
${dimensionNote}${logoNote}`;

  const breakpointDimensionNote = breakpointWidth && breakpointHeight
    ? `\n5. UNIT SIZE AT THIS BREAKPOINT: the unit must be ${breakpointWidth}×${breakpointHeight}px within this scope. Set .wrapper { width: ${breakpointWidth}px; max-width: 100%; height: auto; } (or min-height if content-driven) inside this specific scope only — do not apply this size outside the target scope.`
    : '';

  const breakpointNote = breakpointTier
    ? `

═══════════════════════════════════════════════════════════
BREAKPOINT-SCOPED REFERENCE — READ THIS CAREFULLY, IT CHANGES YOUR SCOPE OF WORK
═══════════════════════════════════════════════════════════
This image is a reference for ONLY ONE specific screen size: ${breakpointTier === 'desktop' ? 'the DESKTOP / default (no media query) rules' : `the @media (max-width: ${breakpointPx}px) block`}.

Your task is NARROWER than a normal refine request:
1. If tier is desktop: modify ONLY the base rules that apply with no media query (outside any @media block). Do NOT touch any existing @media block at all — leave every single one exactly as it is in the input, byte-for-byte.
2. If tier is tablet/mobile/custom: modify ONLY the rules inside the @media (max-width: ${breakpointPx}px) block. If that exact media query does not exist yet in the current CSS, create it. Do NOT touch base/desktop rules. Do NOT touch any OTHER @media block (e.g. if this reference is for 480px, a separate 768px block must remain completely untouched).
3. Every rule outside the scope described above — base rules if this is a breakpoint reference, or any @media block if this is a desktop reference — must appear in your output IDENTICAL to the input. Copy them verbatim.
4. This is a stricter version of the general "preserve everything unrelated" rule — here the boundary is not just "selectors mentioned in feedback" but a specific, literal CSS scope (one media query OR the base rules). Treat anything outside that scope as completely off-limits, even if you think it could be improved.
${breakpointDimensionNote}

IF THE REFERENCE SHOWS FEWER AD SLOTS THAN THE FULL UNIT (e.g. "single ad" when the unit normally has multiple): hide the extra slots WITHIN THIS SCOPE ONLY using :is(#dianomi_ad_2, #dianomi_ad_3, ...) { display: none !important; } for whichever IDs should not show at this breakpoint — but this display:none rule must ALSO live inside the same scoped @media block (or base rules if desktop), never applied globally, since hiding slots at one breakpoint must not affect any other breakpoint.

Think of this as patching one specific paint layer of a multi-layer design — you are not touching the other layers at all.
═══════════════════════════════════════════════════════════`
    : '';

  const userMessage = `This is refinement round ${round}.

${domNote}${breakpointNote}${historyNote}

Num Ads: ${numAds}
Element Order: ${order}
${order === 'text,provider'
  ? 'The headline (.maintext) must appear ABOVE/BEFORE the provider name (.dianomi_provider_short) visually. If the current CSS does not achieve this, add: .text { display:flex; flex-direction:column; } .text .maintext { order:1; } .text .dianomi_provider_short { order:2; }'
  : 'The provider name (.dianomi_provider_short) must appear ABOVE/BEFORE the headline (.maintext) visually. If the current CSS does not achieve this, add: .text { display:flex; flex-direction:column; } .text .dianomi_provider_short { order:1; } .text .maintext { order:2; }'}

Here is the reference screenshot that the CSS should match${breakpointTier ? ` at the ${breakpointTier === 'desktop' ? 'desktop' : breakpointPx + 'px'} breakpoint specifically` : ''}:

[image attached]

Here is the current CSS:
\`\`\`css
${currentCSS}
\`\`\`

${breakpointTier ? 'ADDITIONAL NOTE from the person (optional, may be empty):' : 'USER FEEDBACK — fix exactly these issues:'}
${feedback}

Output the complete corrected CSS.`;

  const geminiBody = {
    contents: [
      {
        parts: [
          { text: REFINE_SYSTEM + '\n\n' + userMessage },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ],
    generationConfig: Object.assign({
      temperature: 0.1,
      maxOutputTokens: 4000,
      topP: 0.9
    }, selectedModel.startsWith('gemini-2.5') ? {
      thinkingConfig: { thinkingBudget: thinkingBudgetByModel[selectedModel] || 512 }
    } : {})
  };

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      let detail;
      try { detail = JSON.parse(errText); } catch(e) { detail = errText; }
      return res.status(upstream.status).json({ error: `Gemini API error: ${upstream.status}`, detail });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastContentAt = Date.now();
    let firstTokenReceived = false;
    const FIRST_TOKEN_GRACE = 25000;
    const IDLE_TIMEOUT = 10000;
    const MAX_TOTAL = 55000;
    const startedAt = Date.now();

    while (true) {
      const sinceContent = Date.now() - lastContentAt;
      const elapsed = Date.now() - startedAt;
      const currentTimeout = firstTokenReceived ? IDLE_TIMEOUT : FIRST_TOKEN_GRACE;

      if (elapsed > MAX_TOTAL || sinceContent > currentTimeout) break;

      let done, value;
      try {
        const result = await Promise.race([
          reader.read(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('idle')), Math.min(currentTimeout - sinceContent, MAX_TOTAL - elapsed) + 100))
        ]);
        done = result.done;
        value = result.value;
      } catch (e) { break; }

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const part = parsed?.candidates?.[0]?.content?.parts?.[0];
            const text = part?.text;
            const isThought = part?.thought === true;
            const finishReason = parsed?.candidates?.[0]?.finishReason;

            if (text && !isThought) {
              lastContentAt = Date.now();
              firstTokenReceived = true;
              const clean = text.replace(/^```css\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
              res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: clean } }] })}\n\n`);
            } else if (text && isThought) {
              lastContentAt = Date.now();
            }

            if (finishReason && finishReason !== 'OTHER') break;
          } catch (e) { /* skip */ }
        }
      }
    }

    res.write('data: [DONE]\n\n');
    return res.end();

  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
};
