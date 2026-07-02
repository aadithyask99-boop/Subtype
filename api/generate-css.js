export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are an expert in Dianomi ad unit CSS. You will be given a screenshot of a Dianomi ad unit design and must generate CSS that replicates it.

The Dianomi DOM structure is fixed and cannot be changed. Your CSS must target only these selectors:

WRAPPER & LAYOUT:
  body — iframe body
  .wrapper — outermost container (use flex, never table or float)
  .dianomi-wt — attribution container (list units only)

AD SLOTS:
  .hero — individual ad slot (repeats N times)
  .hero.first — first slot only
  .hero.last — last slot only
  #dianomi_ad_1, #dianomi_ad_2 ... — individual slot IDs

CONTENT (dynamically populated by advertiser — do not hardcode text):
  .subhero a.dianomihref — clickable anchor wrapping img + text
  .hero img — ad image (no hardcoded height/width attrs in HTML)
  .text — text block container
  .maintext — headline
  .dianomi_provider_short — advertiser/provider name
  .action — CTA button (hidden by default unless Use Action is set)
  .line2 — unit-level label e.g. "SPONSORED CONTENT" (list units)
  .line2 .title — inner span of line2
  span.line2 — JS-injected "Advertisement" span (always display:none)

ALWAYS HIDDEN:
  .heading_top, .dianomiHeading.heading — always display:none

ATTRIBUTION:
  .sub-line2 — Dianomi logo container
  .sub-line2 img.dianomi-lg — the logo image

KEY RULES:
1. Always use display:flex on .wrapper and .subhero a.dianomihref
2. Never use float, display:table, or position:absolute on content elements
3. .text must always have position:static !important
4. .dianomi_provider_short needs display:block !important to override Dianomi's injected style="display:inline"
5. span.line2 must always be display:none (it is JS-injected and should not be visible)
6. For image above text: img { order:2 } .text { order:1 }
7. For text above image: img { order:2; margin-top:12px } .text { order:1 }
8. For side-by-side (landscape): a.dianomihref { flex-direction:row }
9. For list units with N ads: .hero:not(.last) handles dividers between items
10. Font imports go in Header Html field not CSS — in CSS just reference the font-family name

Output ONLY valid CSS. No markdown, no explanation, no backticks. Start directly with the first CSS rule.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { imageBase64, mimeType = 'image/png', numAds = 1, order = 'provider,text' } = body;

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const userPrompt = `Generate CSS for this Dianomi ad unit screenshot.

Context:
- Num Ads: ${numAds}
- Element Order: ${order}
- ${numAds > 1 ? 'This is a multi-ad list unit. Use flex-direction:column on .wrapper, with .hero:not(.last) for dividers between items.' : 'This is a single-ad unit.'}
- ${order === 'text,provider' ? 'Text (headline) appears before provider name in the DOM.' : 'Provider name appears before text (headline) in the DOM.'}

Replicate the layout, typography, colours, spacing and image treatment shown in the screenshot. Use the flex-first pattern described in your instructions.`;

  const openRouterBody = {
    model: 'google/gemini-2.0-flash-exp:free',
    stream: true,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }
    ]
  };

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://subtype.vercel.app',
        'X-Title': 'Dianomi Subtype Tool'
      },
      body: JSON.stringify(openRouterBody)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: `OpenRouter error: ${upstream.status}`, detail: errText }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Stream the response back
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
