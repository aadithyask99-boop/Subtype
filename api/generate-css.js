const fs = require('fs');
const path = require('path');

// Load full skill knowledge base at runtime
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'dianomi-skill.md'),
  'utf8'
);

// Load reference images as base64 for few-shot examples
function loadRefImage(filename) {
  const filePath = path.join(__dirname, 'reference-images', filename);
  return fs.readFileSync(filePath).toString('base64');
}

const REF_IMAGE_1 = loadRefImage('example-1-portrait-single.png');       // MarketWatch portrait single-ad
const REF_IMAGE_2 = loadRefImage('example-2-list-300x600.png');          // Telegraph 5-item list 300x600
const REF_IMAGE_3 = loadRefImage('example-3-landscape-970x250.png');     // Landscape single-ad with CTA button

const REF_CSS_1 = `body {
  padding: 0;
  margin: 0;
  width: 100%;
  height: auto;
  overflow: visible;
  box-sizing: border-box;
}

.wrapper {
  width: 100%;
  height: auto;
  overflow: visible;
  background-color: #fff;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.sub-line2 {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 1;
}

.sub-line2 img {
  width: 55px;
  height: auto;
  display: block;
}

.hero {
  width: 100%;
  box-sizing: border-box;
}

.hero:not(.last) {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.dianomihref {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}

.text {
  order: 1;
  display: flex;
  flex-direction: column;
  position: static !important;
  padding-bottom: 12px;
}

.hero img {
  order: 2;
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.heading_top, .dianomiHeading.heading {
  display: none;
}

span.line2 {
  display: none;
}

.dianomi_provider_short {
  font-family: 'Roboto', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #6A6A6A;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block !important;
  margin-bottom: 6px;
}

.dianomi_provider_short::before {
  content: "ADVERTISEMENT \\00B7 ";
  font: inherit;
}

.maintext {
  font-family: 'founders-grotesk-condensed-bold', sans-serif;
  font-size: 36px;
  font-weight: 600;
  line-height: 1.1em;
  color: #000;
  display: block;
  margin: 10px 0 -10px 0;
}

.action {
  display: none;
}`;

const REF_CSS_2 = `body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: auto;
  overflow: visible;
  box-sizing: border-box;
  font-family: 'Inter', sans-serif;
  background: #fff;
}

.wrapper {
  width: 100%;
  height: auto;
  overflow: visible;
  background-color: #fff;
  padding: 12px 14px 40px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.dianomi-wt {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.sub-line2 {
  position: absolute;
  bottom: 12px;
  right: 14px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sub-line2 img.dianomi-lg {
  width: 53px;
  height: auto;
  display: inline;
}

.dianomi-yac img {
  height: 12px;
  width: auto;
  display: inline;
}

.line2 {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
  display: block;
  border-bottom: 1px solid #ebebeb;
  padding-bottom: 10px;
}

.line2 .title {
  font: inherit;
}

.hero {
  width: 100%;
  box-sizing: border-box;
}

.hero:not(.last) {
  border-bottom: 1px solid #ebebeb;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.dianomihref {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}

.hero img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  flex-shrink: 0;
  display: block;
  border-radius: 4px;
}

.text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: static !important;
  box-sizing: border-box;
  min-width: 0;
}

.heading_top, .dianomiHeading.heading {
  display: none;
}

span.line2 {
  display: none;
}

.maintext {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #1a1a1a;
  display: block;
  margin: 0 0 4px 0;
}

.dianomi_provider_short {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 400;
  color: #999;
  display: block !important;
  text-transform: none;
  letter-spacing: 0;
}

.action {
  display: none;
}`;

const REF_CSS_3 = `body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: auto;
  overflow: visible;
  box-sizing: border-box;
  font-family: 'Roboto', sans-serif;
}

.wrapper {
  width: 100%;
  height: auto;
  overflow: visible;
  background-color: #fff;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.hero {
  width: 100%;
  box-sizing: border-box;
}

.dianomihref {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24px;
  text-decoration: none;
  color: inherit;
}

.hero img {
  flex-shrink: 0;
  width: 400px;
  height: 250px;
  object-fit: cover;
  display: block;
}

.text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: static !important;
  padding: 24px 24px 24px 0;
}

.heading_top, .dianomiHeading.heading {
  display: none;
}

span.line2 {
  display: none;
}

.maintext {
  font-family: 'Roboto', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.25;
  display: block;
  margin: 0 0 8px 0;
}

.dianomi_provider_short {
  font-family: 'Roboto', sans-serif;
  font-size: 15px;
  font-weight: 400;
  color: #444;
  display: block !important;
  margin-bottom: 16px;
  text-transform: none;
  letter-spacing: 0;
}

.action {
  display: inline-block;
  width: fit-content;
  padding: 12px 28px;
  background: #000;
  color: #fff;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.dianomihref {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.hero img {
  width: 100%;
  height: auto;
  aspect-ratio: 16/10;
}

.text {
  padding: 0 16px 16px 16px;
}

.maintext {
  font-size: 20px;
}`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { return res.status(500).json({ error: 'GEMINI_API_KEY not configured' }); }

  const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];

  const {
    imageBase64,
    mimeType = 'image/png',
    numAds = 1,
    order = 'provider,text',
    headerElements = {},
    widthPx = null,
    heightPx = null,
    unitType = 'iab',
    model = 'gemini-2.5-flash'
  } = req.body || {};
  if (!imageBase64) { return res.status(400).json({ error: 'imageBase64 required' }); }

  const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'gemini-2.5-flash';

  const thinkingBudgetByModel = {
    'gemini-2.5-pro': 2048,
    'gemini-2.5-flash': 1024,
    'gemini-2.5-flash-lite': 512
  };

  const unitTypeLabel = unitType === 'responsive' ? 'Responsive' : 'IAB Fixed';
  const dimensionNote = widthPx && heightPx
    ? `

UNIT TYPE — MANDATORY BEHAVIOUR (this is not optional):
This is a ${widthPx}×${heightPx}px unit. Type: ${unitTypeLabel}.
${unitType === 'iab'
  ? `Because this is IAB Fixed:
- Add \`max-width: ${widthPx}px\` and \`width: 100%\` to .wrapper so it shrinks proportionally inside any container up to its natural size
- Do NOT add breakpoints that change flex-direction, hide elements, or restructure the layout
- At most ONE fallback media query at max-width:480px is allowed, and it may ONLY flip flex-direction from row to column if the layout is horizontal — nothing else
- Font sizes and image dimensions stay fixed at their base values; they do not scale per breakpoint`
  : `Because this is Responsive:
- Add real breakpoints (768px and 480px minimum) that genuinely restructure the layout for smaller screens
- Stack horizontal layouts vertically on mobile
- Reduce font sizes at each breakpoint
- Adjust padding/gaps to be tighter on mobile
- This unit must look intentionally designed for phone screens, not just shrunk`}`
    : '';

  const domNote = `

IMPORTANT — actual Header Html composition for THIS unit:
- Dianomi logo (.sub-line2): ${headerElements.logo ? 'PRESENT' : 'NOT PRESENT — do not style .sub-line2, it does not exist in the DOM'}
- Your Ad Choices icon (.dianomi-yac): ${headerElements.yac ? 'PRESENT' : 'NOT PRESENT'}
- Unit heading label (div.line2): ${headerElements.line2 ? `PRESENT with text "${headerElements.line2Text || 'Sponsored Content'}"` : 'NOT PRESENT — do not style div.line2, it does not exist in the DOM. If the screenshot shows a heading label, it cannot be replicated via CSS alone — ignore it for this generation.'}
- Action/CTA fallback script (.action fill): ${headerElements.action ? 'PRESENT — .action can show "Read More" text' : 'NOT PRESENT — .action will remain empty, style it as hidden'}

Only write CSS for elements confirmed PRESENT above. Do not assume any element exists just because it appears in the screenshot — if it's marked NOT PRESENT, that visual element in the screenshot cannot be reproduced by this subtype's current Header Html configuration.`;

  const userPrompt = `Generate CSS for this Dianomi ad unit screenshot.

Context:
- Num Ads: ${numAds}
- Element Order: ${order}
- ${numAds > 1 ? 'Multi-ad list unit. Use flex-direction:column on .wrapper, .hero:not(.last) for dividers.' : 'Single-ad unit.'}
- ${order === 'text,provider' ? 'Headline appears before provider name in DOM.' : 'Provider name appears before headline in DOM.'}

Before writing any CSS, look carefully at the screenshot and work through these questions internally:
1. Layout family — which of the 5 patterns in your instructions does this match closest, or is it a hybrid?
2. Count — exactly how many ad cards/items are visible?
3. Heading — is there a unit-level label (div.line2)? DO NOT default to a generic small-caps grey label. Read its ACTUAL typography from the screenshot: font family (serif/script/sans), size, weight, colour, letter-spacing, alignment, any border/divider. If it has TWO visually distinct lines (e.g. a large title plus a smaller italic/script subtitle), use a pseudo-element (.line2 .title::after with content) to render the second line — see the "Multi-line headings" technique in your instructions. Never skip or simplify a heading just because it's more complex than the reference examples. If a horizontal card grid is also present (multiple cards side by side), remember div.line2 MUST get width:100% or it will sit inline next to the first cards instead of spanning above the whole grid — flag this now so you don't forget it when writing the CSS.
4. Image — aspect ratio, corner treatment (sharp corners = no border-radius; slightly rounded = 4-8px; pill/very rounded = 12-20px; circular = 50%). Commit to a specific pixel value, do not skip this or leave it at browser default. Position relative to text (above/below/left/right), any visible gap between image and text.
5. Typography — is the headline serif or sans-serif? Estimate its font-size relative to the provider label. What colour is the headline? What colour and weight is the provider label — is it uppercase, does it have letter-spacing, does it have an underline or accent mark beneath it (small coloured bar, thin line)?
6. Spacing — estimate the outer padding of the wrapper in pixels by comparing to the image width. Estimate the gap between cards/items. Estimate the gap between image and text within a card.
7. Attribution — where does the Dianomi logo sit? Six possible positions: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right.
8. Background and dividers — is there a background colour other than white? Are there visible border lines between items, and what colour/weight?
9. Provider position relative to image — is the provider name inline with/beside the headline (normal case), OR does it appear as a separate label ABOVE both the image and headline (e.g. a brand name spanning the full card width, with the image and description below it)? If the latter, this requires the display:contents grid-breakout technique from your instructions — .text alone cannot achieve this because .dianomi_provider_short and .maintext are both trapped inside it by default.

Only after reasoning through all 8 points, write the CSS. Match what you actually observed, not a generic default. Study the three reference examples above for code quality and the correct selector patterns, but derive every specific value (colours, sizes, spacing) from THIS screenshot, not from the references.

FINAL REMINDERS before you write (these are the most commonly missed rules):
- Every CSS rule spans MULTIPLE LINES — selector, brace, one property per line, closing brace. Never one-line compressed rules. Match the exact formatting of the three reference examples above.
- Each selector appears EXACTLY ONCE in your output.
- Use .hero img, never .dianomihref img.
- Use .dianomihref (short form), never .subhero a.dianomihref.
- If cards sit side by side in a row, use .wrapper { display:flex; flex-direction:row; flex-wrap:wrap } — do not default to column.
- CRITICAL — if .wrapper is flex-direction:row AND a heading (div.line2) is present: div.line2 is a sibling of .hero inside .wrapper, so without an explicit width it will sit INLINE next to the first cards instead of spanning above them as a heading. You MUST add .line2 { width:100%; flex-shrink:0; } whenever .wrapper uses flex-direction:row. Skipping this is the single most common visible bug in this system — the heading squeezes into the card row instead of sitting above it. Check this every time a heading and a horizontal grid appear together.
- Group repeated ID selectors with :is(#dianomi_ad_1, #dianomi_ad_2) instead of repeating full chains.
- No CSS comments, no markdown fences.

Be concise in the final output — 50-80 rules max, no commentary, just CSS.` + domNote + dimensionNote;

  // Multi-turn few-shot: show real screenshot → real production CSS pairs before asking for the new one
  const geminiBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT + '\n\nHere is a REFERENCE EXAMPLE. This screenshot shows a single-ad portrait Dianomi unit. Study it, then I will show you the exact production CSS that recreates it.' },
          { inline_data: { mime_type: 'image/png', data: REF_IMAGE_1 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: 'I see a single-ad portrait unit: headline above image, provider label with "ADVERTISEMENT ·" prefix, Dianomi logo bottom-right. Here is the CSS that recreates it precisely:\n\n' + REF_CSS_1 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a SECOND REFERENCE EXAMPLE — a 5-item list unit (300x600 right rail), thumbnail-left layout with a heading label at top. This CSS represents solid structural defaults for this layout family (spacing scale, thumbnail sizing, typography hierarchy) — treat it as a strong starting pattern to adapt, not a pixel-exact match to copy blindly.' },
          { inline_data: { mime_type: 'image/png', data: REF_IMAGE_2 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: 'I see a multi-ad list: thumbnail images left, headline+provider text right, dividers between items, unit heading at top. Here is CSS using solid structural defaults for this layout family:\n\n' + REF_CSS_2 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a THIRD REFERENCE EXAMPLE — a landscape single-ad unit (970x250 style), image left at fixed size, headline+provider+button stacked right, black CTA button reading "Read More". Study the image sizing, the button styling, and the flex-row layout.' },
          { inline_data: { mime_type: 'image/png', data: REF_IMAGE_3 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: 'I see a landscape single-ad unit: fixed-size image on the left (roughly 400x250, no rounded corners), text block vertically centered on the right with a bold sans-serif headline, a lighter-weight provider line, and a solid black rectangular CTA button below. Here is the CSS:\n\n' + REF_CSS_3 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: userPrompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4000,
      topP: 0.95,
      thinkingConfig: {
        thinkingBudget: thinkingBudgetByModel[selectedModel] || 1024
      }
    }
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
      return res.status(upstream.status).json({
        error: `Gemini API error: ${upstream.status}`,
        detail,
        hint: upstream.status === 429 ? 'Check aistudio.google.com for quota usage. Try gemini-1.5-flash as fallback.' : undefined
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastContentAt = Date.now();
    let firstTokenReceived = false;
    const FIRST_TOKEN_GRACE = 30000;  // allow up to 30s for thinking phase before first token
    const IDLE_TIMEOUT = 10000;       // after first token, close if silent for 10s
    const MAX_TOTAL = 55000;          // hard cap at 55s
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

            // Only forward real answer text, never thinking/reasoning text
            if (text && !isThought) {
              lastContentAt = Date.now();
              firstTokenReceived = true;
              const clean = text.replace(/^```css\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
              res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: clean } }] })}\n\n`);
            } else if (text && isThought) {
              // Thinking token arrived — reset the grace timer so it doesn't expire mid-thought
              lastContentAt = Date.now();
            }

            if (finishReason && finishReason !== 'OTHER') {
              buffer = ''; // flush
              break;
            }
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
}
