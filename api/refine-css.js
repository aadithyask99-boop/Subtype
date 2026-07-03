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

BEFORE WRITING: List every selector that appears in the current CSS. Your output must preserve every one of them unless the feedback explicitly says to remove something. Do not silently drop selectors (e.g. .line2, .sub-line2) while rewriting — this is the most common mistake to avoid.

STRICT RULES:
- FORMATTING: every rule spans multiple lines. Selector, opening brace, one property per line indented 2 spaces, closing brace alone, blank line, next rule. NEVER compress a rule onto one line.
- Output the COMPLETE corrected CSS, not just the changed parts
- Each selector appears EXACTLY ONCE — no duplicate declarations
- No CSS comments, no markdown fences, no backticks
- Keep everything that was already correct, only fix what the feedback describes
- Write selectors in this order: body, .wrapper, attribution (.sub-line2/.dianomi-wt), heading (.line2), slots (.hero), card anchor (.dianomihref), image (.hero img), text (.text), provider (.dianomi_provider_short), headline (.maintext), CTA (.action), always-hidden elements, media queries
- These rules are always required regardless of feedback:
  - .text { position: static !important }
  - .dianomi_provider_short { display: block !important }
  - span.line2 { display: none }
  - .heading_top, .dianomiHeading.heading { display: none }
  - Never use float, display:table, or duplicate selector declarations
  - Use .hero img not .dianomihref img
  - Use .dianomihref not .subhero a.dianomihref
  - For horizontal card grids: .wrapper { display:flex; flex-direction:row; flex-wrap:wrap } and .line2 { width:100%; flex-shrink:0 }
  - Visual reorder of provider/headline can be done with flex order on .text if needed — .text { display:flex; flex-direction:column } .text .dianomi_provider_short{order:1} .text .maintext{order:2}
  - Pseudo-elements (::before, ::after) are fine for decorative marks
  - Group multiple ID overrides with :is(#dianomi_ad_1, #dianomi_ad_2) instead of repeating full chains

Start directly with the first CSS rule. No preamble.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { return res.status(500).json({ error: 'GEMINI_API_KEY not configured' }); }

  const {
    imageBase64,
    mimeType = 'image/png',
    currentCSS = '',
    feedback = '',
    numAds = 1,
    order = 'provider,text',
    headerElements = {},
    widthPx = null,
    heightPx = null,
    unitType = 'iab',
    round = 1
  } = req.body || {};

  if (!imageBase64) { return res.status(400).json({ error: 'imageBase64 required' }); }
  if (!feedback) { return res.status(400).json({ error: 'feedback required' }); }

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
${dimensionNote}`;

  const userMessage = `This is refinement round ${round}.

${domNote}

Num Ads: ${numAds}
Element Order: ${order}

Here is the reference screenshot that the CSS should match:

[image attached]

Here is the current CSS:
\`\`\`css
${currentCSS}
\`\`\`

USER FEEDBACK — fix exactly these issues:
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
    generationConfig: {
      temperature: 0.1,  // lower temp for corrections — be precise not creative
      maxOutputTokens: 4000,
      topP: 0.9,
      thinkingConfig: { thinkingBudget: 512 }  // lighter thinking for refinement
    }
  };

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
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
