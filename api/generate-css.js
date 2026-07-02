const SYSTEM_PROMPT = `You are an expert in Dianomi ad unit CSS. You will be given a screenshot of a Dianomi ad unit design and must generate CSS that replicates it precisely.

The Dianomi DOM structure is fixed. Here is the EXACT HTML you are styling:

<div class="wrapper dianomi_smartad_1 _dianomi_wrapper dianomi_branded">
  <!-- .dianomi-wt and .sub-line2 only present in list units -->
  <div class="dianomi-wt">
    <div class="sub-line2">
      <a href="..."><img class="dianomi-lg" src="dianomi-logo.png"></a>
    </div>
  </div>
  <!-- .line2 is the unit-level heading e.g. "Around the web", "Sponsored Content" -->
  <div class="line2"><span class="title">Around the web</span></div>
  <!-- .hero repeats N times. first = .hero.first, last = .hero.last -->
  <div id="dianomi_ad_1" class="hero first">
    <div class="subhero">
      <div class="heading_top"></div>
      <a class="dianomihref" href="#">
        <img class="png" src="ad-image.jpg">
        <div class="text">
          <div class="dianomiHeading heading"></div>
          <!-- element order = provider,text: -->
          <div class="dianomi_provider_short">Provider Name</div>
          <span class="line2">Advertisement</span>  <!-- ALWAYS hide this span -->
          <div class="maintext">Ad Headline Text</div>
          <div class="action"></div>
        </div>
      </a>
    </div>
  </div>
  <!-- more .hero divs... -->
</div>

SELECTOR REFERENCE:
- .wrapper — outermost container
- .dianomi-wt — attribution row (list units only)
- .sub-line2 — Dianomi logo/whatsthis link
- .sub-line2 img.dianomi-lg — the logo
- .line2 (div) — unit heading label e.g. "Around the web" — STYLE THIS, never hide it
- .line2 .title — inner span of unit heading
- span.line2 — JS-injected "Advertisement" per-item label — ALWAYS display:none
- .hero — individual ad card
- .hero.first — first card
- .hero.last — last card
- .hero:not(.last) — all cards except last (use for dividers/gaps)
- #dianomi_ad_1, #dianomi_ad_2 etc — individual card IDs
- .subhero a.dianomihref — clickable anchor (the real layout container per card)
- .hero img — ad image
- .text — text block
- .maintext — headline text
- .dianomi_provider_short — advertiser name
- .action — CTA button (hidden by default)
- .heading_top, .dianomiHeading.heading — always display:none, always empty

CRITICAL RULES — follow these exactly:
1. .wrapper: use display:flex. Never use float or display:table.
2. .subhero a.dianomihref: use display:flex. This is the card layout container.
3. .text: always position:static !important
4. .dianomi_provider_short: always display:block !important (overrides inline style injected by Dianomi)
5. span.line2: always display:none (it is JS-injected per item, not the heading)
6. div.line2: STYLE IT — this is the real heading label, never hide it
7. .sub-line2: position it based on the screenshot (often absolute top-right or bottom-right)
8. No hardcoded font @import or @font-face in CSS output — reference font-family by name only
9. Study the screenshot carefully: count the number of columns, measure approximate spacing, note font sizes relative to each other, identify the background colour, note whether images are above or below text

LAYOUT PATTERNS — pick the one matching the screenshot:
- 4-column horizontal grid: .wrapper { flex-direction:row } .hero { flex:1 1 0; min-width:0 }
- Single column portrait: .wrapper { flex-direction:column } .subhero a.dianomihref { flex-direction:column }
- List (image-left, text-right): .subhero a.dianomihref { flex-direction:row } img { width:80px; flex-shrink:0 }
- Landscape single (970x250): .subhero a.dianomihref { flex-direction:row } .action { display:block }

Output ONLY valid CSS. No markdown fences, no backticks, no explanation. Start directly with the first CSS rule. Be concise — combine selectors where possible, avoid redundant declarations. Target 50-80 rules maximum.`;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  const apiKey = process.env.NVIDIA_API_KEY || process.env.Nvidia_api;
  if (!apiKey) { return res.status(500).json({ error: 'NVIDIA_API_KEY not configured' }); }

  const { imageBase64, mimeType = 'image/png', numAds = 1, order = 'provider,text' } = req.body || {};

  if (!imageBase64) { return res.status(400).json({ error: 'imageBase64 required' }); }

  const userPrompt = `Generate CSS for this Dianomi ad unit screenshot.

Context:
- Num Ads: ${numAds}
- Element Order: ${order}
- ${numAds > 1 ? 'This is a multi-ad list unit. Use flex-direction:column on .wrapper, with .hero:not(.last) for dividers between items.' : 'This is a single-ad unit.'}
- ${order === 'text,provider' ? 'Text (headline) appears before provider name in the DOM.' : 'Provider name appears before text (headline) in the DOM.'}

Replicate the layout, typography, colours, spacing and image treatment shown in the screenshot. Use the flex-first pattern described in your instructions.`;

  // NVIDIA integrate.api.nvidia.com — MiniMax-M3 multimodal payload shape
  const nvidiaBody = {
    model: 'minimaxai/minimax-m3',
    max_tokens: 3000,
    temperature: 0.2,
    top_p: 0.95,
    stream: true,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT + '\n\n' + userPrompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
        ]
      }
    ]
  };

  try {
    const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(nvidiaBody)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: `NVIDIA API error: ${upstream.status}`, detail: errText });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finishReason = null;
    let lastContentAt = Date.now();
    const CONTENT_TIMEOUT_MS = 8000;  // if no new CSS token for 8s, assume done
    const MAX_TOTAL_MS = 50000;       // hard cap at 50s total
    const startedAt = Date.now();

    // Poll reader with content-aware timeout
    while (true) {
      const elapsed = Date.now() - startedAt;
      const sinceLastContent = Date.now() - lastContentAt;

      // Hard cap
      if (elapsed > MAX_TOTAL_MS) {
        console.log('Max total time reached, closing');
        break;
      }

      // No new content token for 8s — NVIDIA is done or stalled
      if (sinceLastContent > CONTENT_TIMEOUT_MS) {
        console.log('No content for 8s, closing stream');
        break;
      }

      const remaining = Math.min(
        CONTENT_TIMEOUT_MS - sinceLastContent,
        MAX_TOTAL_MS - elapsed
      );

      let done, value;
      try {
        const result = await Promise.race([
          reader.read(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('idle')), remaining + 100))
        ]);
        done = result.done;
        value = result.value;
      } catch (e) {
        // Idle timeout fired — break and send DONE
        break;
      }

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue;

        if (trimmed === 'data: [DONE]') {
          finishReason = 'done';
          break;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            const reason = parsed.choices?.[0]?.finish_reason;

            if (reason) { finishReason = reason; }

            if (delta) {
              lastContentAt = Date.now(); // reset idle timer on real content
              res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
            }
          } catch (e) { /* unparseable, skip */ }
        }
      }

      if (finishReason) break;
    }

    res.write('data: [DONE]\n\n');
    return res.end();

  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
}
