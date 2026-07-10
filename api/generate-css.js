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

const REF_IMAGE_1 = loadRefImage('example-1-portrait-single.jpg');       // MarketWatch portrait single-ad
const REF_IMAGE_2 = loadRefImage('example-2-list-300x600.jpg');          // Telegraph 5-item list 300x600
const REF_IMAGE_3 = loadRefImage('example-3-landscape-970x250.jpg');     // Landscape single-ad with CTA button
const REF_IMAGE_4 = loadRefImage('example-4-heading-grid.jpg');         // 2-col grid with full-width heading + underline logo
const REF_IMAGE_5 = loadRefImage('example-5-gift-guide.jpg');           // Multi-line decorative heading + provider-as-label grid technique
const REF_IMAGE_6 = loadRefImage('example-6-ft-hybrid-grid.jpg');       // FT-style 3-column grid, serif heading top-left
const REF_IMAGE_7 = loadRefImage('example-7-multizone-magazine.jpg');   // Multi-zone magazine (PAID PARTNER CONTENT style)
const REF_IMAGE_8 = loadRefImage('example-8-asymmetric-grid-span.jpg'); // 1 large item + 3 stacked compact items, CSS Grid row-span

const REF_CSS_1 = `body {
  padding: 0;
  margin: 0;
  width: 100%;
  height: auto;
  overflow-x: hidden;
  overflow-y: hidden;
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

.text .line2 {
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
  overflow-x: hidden;
  overflow-y: hidden;
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

.text .line2 {
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
  overflow-x: hidden;
  overflow-y: hidden;
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

.text .line2 {
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

const REF_CSS_4 = `body {\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  height: auto;\n  overflow-x: hidden;\n  overflow-y: hidden;\n  box-sizing: border-box;\n}\n\n.wrapper {\n  width: 100%;\n  background: #fff;\n  padding: 16px;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: row;\n  flex-wrap: wrap;\n  align-items: flex-start;\n  position: relative;\n}\n\n.line2 {\n  width: 100%;\n  flex-shrink: 0;\n  font-family: \'Arial Black\', sans-serif;\n  font-size: 34px;\n  font-weight: 900;\n  color: #1a1a1a;\n  margin-bottom: 20px;\n  display: block;\n}\n\n.line2 .title {\n  font: inherit;\n}\n\n.sub-line2 {\n  position: absolute;\n  top: 16px;\n  right: 16px;\n  z-index: 1;\n}\n\n.sub-line2 img.dianomi-lg {\n  width: 20px;\n  height: auto;\n  opacity: 0.5;\n}\n\n.hero {\n  flex: 1 1 calc(50% - 8px);\n  box-sizing: border-box;\n  padding: 0 8px;\n  margin-bottom: 16px;\n}\n\n.dianomihref {\n  display: flex;\n  flex-direction: column;\n  text-decoration: none;\n  color: inherit;\n}\n\n.hero img {\n  width: 100%;\n  aspect-ratio: 4/3;\n  object-fit: cover;\n  display: block;\n  margin-bottom: 10px;\n}\n\n.text {\n  position: static !important;\n  display: flex;\n  flex-direction: column;\n}\n\n.heading_top, .dianomiHeading.heading {\n  display: none;\n}\n\n.text .line2 {\n  display: none;\n}\n\n.maintext {\n  font-size: 20px;\n  font-weight: 700;\n  line-height: 1.3;\n  color: #1a1a1a;\n  display: block;\n  margin: 0 0 4px 0;\n}\n\n.dianomi_provider_short {\n  font-size: 14px;\n  font-weight: 400;\n  color: #666;\n  display: block !important;\n}\n\n.action {\n  display: none;\n}`;

const REF_CSS_5 = `body {\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  height: auto;\n  overflow-x: hidden;\n  overflow-y: hidden;\n  box-sizing: border-box;\n  background: #fff;\n}\n\n.wrapper {\n  width: 100%;\n  background: #fff;\n  padding: 24px 20px;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n}\n\n.line2 {\n  text-align: center;\n  padding-bottom: 16px;\n  margin-bottom: 20px;\n  border-bottom: 1px dashed #ccc;\n}\n\n.line2 .title {\n  display: block;\n  font-family: \'Playfair Display\', serif;\n  font-size: 34px;\n  letter-spacing: 2px;\n  text-transform: uppercase;\n  color: #1a1a1a;\n}\n\n.line2 .title::after {\n  content: \'for Him\';\n  display: block;\n  font-family: \'Dancing Script\', cursive;\n  font-style: italic;\n  font-size: 22px;\n  margin-top: 4px;\n  color: #1a1a1a;\n}\n\n.sub-line2 {\n  position: absolute;\n  bottom: 12px;\n  right: 12px;\n  z-index: 1;\n}\n\n.sub-line2 img.dianomi-lg {\n  width: 16px;\n  height: auto;\n  opacity: 0.5;\n}\n\n.hero {\n  width: 100%;\n  box-sizing: border-box;\n}\n\n.hero:not(.last) {\n  border-bottom: 1px dashed #ccc;\n  padding-bottom: 16px;\n  margin-bottom: 16px;\n}\n\n.dianomihref {\n  display: grid;\n  grid-template-columns: 90px 1fr;\n  grid-template-areas:\n    "label label"\n    "image text";\n  column-gap: 14px;\n  row-gap: 8px;\n  text-decoration: none;\n  color: inherit;\n}\n\n.hero img {\n  grid-area: image;\n  width: 100%;\n  height: auto;\n  object-fit: cover;\n}\n\n.text {\n  display: contents;\n}\n\n.heading_top, .dianomiHeading.heading {\n  display: none;\n}\n\n.text .line2 {\n  display: none;\n}\n\n.dianomi_provider_short {\n  grid-area: label;\n  display: block !important;\n  font-family: \'Playfair Display\', serif;\n  font-size: 13px;\n  font-weight: 700;\n  letter-spacing: 1px;\n  text-transform: uppercase;\n  color: #1a1a1a;\n}\n\n.dianomi_provider_short::after {\n  content: \'\';\n  display: block;\n  width: 32px;\n  height: 1px;\n  background: #1a1a1a;\n  margin-top: 6px;\n}\n\n.maintext {\n  grid-area: text;\n  font-size: 14px;\n  line-height: 1.5;\n  color: #333;\n}\n\n.action {\n  display: none;\n}`;

const REF_CSS_6 = `body {\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  height: auto;\n  overflow-x: hidden;\n  overflow-y: hidden;\n  box-sizing: border-box;\n  background: #fff;\n}\n\n.wrapper {\n  width: 100%;\n  background: #fff;\n  padding: 20px 0;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: row;\n  flex-wrap: wrap;\n  position: relative;\n}\n\n.line2 {\n  width: 100%;\n  flex-shrink: 0;\n  font-family: Georgia, \'Times New Roman\', serif;\n  font-size: 28px;\n  font-weight: 700;\n  color: #1a1a1a;\n  margin-bottom: 20px;\n  display: block;\n}\n\n.line2 .title {\n  font: inherit;\n}\n\n.sub-line2 {\n  position: absolute;\n  top: 20px;\n  right: 0;\n  z-index: 1;\n}\n\n.sub-line2 img.dianomi-lg {\n  width: 16px;\n  height: auto;\n  display: block;\n  opacity: 0.5;\n}\n\n.hero {\n  flex: 1 1 calc(33.33% - 16px);\n  min-width: 0;\n  box-sizing: border-box;\n  margin-bottom: 24px;\n}\n\n.hero:not(:nth-child(3n+2)) {\n  padding-right: 20px;\n}\n\n.dianomihref {\n  display: flex;\n  flex-direction: column;\n  text-decoration: none;\n  color: inherit;\n}\n\n.hero img {\n  width: 100%;\n  aspect-ratio: 16/9;\n  object-fit: cover;\n  display: block;\n  margin-bottom: 12px;\n}\n\n.text {\n  position: static !important;\n  display: flex;\n  flex-direction: column;\n}\n\n.heading_top, .dianomiHeading.heading {\n  display: none;\n}\n\n.text .line2 {\n  display: none;\n}\n\n.maintext {\n  font-family: Georgia, \'Times New Roman\', serif;\n  font-size: 18px;\n  font-weight: 700;\n  line-height: 1.3;\n  color: #1a1a1a;\n  display: block;\n  margin-bottom: 6px;\n}\n\n.dianomi_provider_short {\n  font-family: Arial, sans-serif;\n  font-size: 13px;\n  font-weight: 400;\n  color: #666;\n  display: block !important;\n}\n\n.action {\n  display: none;\n}\n\n@media (max-width: 768px) {\n  .hero {\n    flex: 1 1 calc(50% - 10px);\n  }\n}\n\n@media (max-width: 480px) {\n  .hero {\n    flex: 1 1 100%;\n    padding-right: 0;\n  }\n\n  .hero img {\n    aspect-ratio: 16/10;\n  }\n}`;

const REF_CSS_7 = `body {\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  height: auto;\n  overflow-x: hidden;\n  overflow-y: hidden;\n  box-sizing: border-box;\n  background: #f2f2f2;\n}\n\n.wrapper {\n  width: 100%;\n  background: #f2f2f2;\n  padding: 16px;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: row;\n  flex-wrap: wrap;\n  gap: 16px;\n  position: relative;\n}\n\n.line2 {\n  width: 100%;\n  flex-shrink: 0;\n  font-family: Arial, sans-serif;\n  font-size: 11px;\n  font-weight: 700;\n  color: #333;\n  text-transform: uppercase;\n  letter-spacing: 1px;\n  margin-bottom: 4px;\n  display: block;\n  border-left: 3px solid #333;\n  padding-left: 8px;\n}\n\n.line2 .title {\n  font: inherit;\n}\n\n.sub-line2 {\n  position: absolute;\n  top: 16px;\n  right: 16px;\n  z-index: 1;\n}\n\n.sub-line2 img.dianomi-lg {\n  width: 60px;\n  height: auto;\n  display: block;\n}\n\n.hero {\n  flex: 1 1 calc(33.33% - 11px);\n  min-width: 0;\n  box-sizing: border-box;\n  background: #fff;\n}\n\n.dianomihref {\n  display: flex;\n  flex-direction: column;\n  text-decoration: none;\n  color: inherit;\n}\n\n.hero img {\n  width: 100%;\n  aspect-ratio: 16/10;\n  object-fit: cover;\n  display: block;\n}\n\n.text {\n  position: static !important;\n  display: flex;\n  flex-direction: column;\n  padding: 12px;\n}\n\n.heading_top, .dianomiHeading.heading {\n  display: none;\n}\n\n.text .line2 {\n  display: none;\n}\n\n.dianomi_provider_short {\n  font-family: Arial, sans-serif;\n  font-size: 11px;\n  font-weight: 700;\n  color: #888;\n  display: block !important;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n  margin-bottom: 6px;\n}\n\n.maintext {\n  font-family: Arial, sans-serif;\n  font-size: 16px;\n  font-weight: 700;\n  line-height: 1.3;\n  color: #1a1a1a;\n  display: block;\n}\n\n.action {\n  display: none;\n}\n\n@media (max-width: 768px) {\n  .hero {\n    flex: 1 1 calc(50% - 8px);\n  }\n}\n\n@media (max-width: 480px) {\n  .wrapper {\n    gap: 10px;\n  }\n\n  .hero {\n    flex: 1 1 100%;\n  }\n}`;

const REF_CSS_8 = `body {\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  height: auto;\n  overflow-x: hidden;\n  overflow-y: hidden;\n  box-sizing: border-box;\n  background: #fff;\n}\n\n.wrapper {\n  width: 100%;\n  background: #fff;\n  padding: 20px;\n  box-sizing: border-box;\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  column-gap: 32px;\n  row-gap: 20px;\n  position: relative;\n}\n\n.line2 {\n  grid-column: 1 / -1;\n  font-family: Arial, sans-serif;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 1px;\n  text-transform: uppercase;\n  color: #1a1a1a;\n}\n\n.line2 .title {\n  font: inherit;\n}\n\n.sub-line2 {\n  position: absolute;\n  top: 16px;\n  right: 16px;\n  z-index: 1;\n}\n\n.sub-line2 img.dianomi-lg {\n  width: 90px;\n  height: auto;\n  display: block;\n}\n\n.hero {\n  box-sizing: border-box;\n}\n\n.hero.first {\n  grid-column: 1;\n  grid-row: 2 / span 3;\n}\n\n.hero:not(.first) {\n  grid-column: 2;\n}\n\n.hero:not(.first):not(.last) {\n  border-bottom: 1px solid #eee;\n  padding-bottom: 16px;\n}\n\n.dianomihref {\n  display: flex;\n  text-decoration: none;\n  color: inherit;\n}\n\n.hero.first .dianomihref {\n  flex-direction: column;\n}\n\n.hero:not(.first) .dianomihref {\n  flex-direction: row;\n  gap: 16px;\n  align-items: flex-start;\n}\n\n.hero.first img {\n  width: 100%;\n  aspect-ratio: 4/3;\n  object-fit: cover;\n  display: block;\n  margin-bottom: 12px;\n}\n\n.hero:not(.first) img {\n  width: 96px;\n  height: 96px;\n  object-fit: cover;\n  flex-shrink: 0;\n  display: block;\n}\n\n.text {\n  position: static !important;\n  display: flex;\n  flex-direction: column;\n}\n\n.heading_top, .dianomiHeading.heading {\n  display: none;\n}\n\n.text .line2 {\n  display: none;\n}\n\n.hero.first .maintext {\n  font-size: 20px;\n  font-weight: 700;\n  line-height: 1.3;\n  color: #1a1a1a;\n}\n\n.hero:not(.first) .maintext {\n  font-size: 17px;\n  font-weight: 700;\n  line-height: 1.3;\n  color: #1a1a1a;\n  margin-bottom: 4px;\n}\n\n.dianomi_provider_short {\n  display: block !important;\n  font-size: 13px;\n  color: #666;\n}\n\n.action {\n  display: none;\n}\n\n@media (max-width: 600px) {\n  .wrapper {\n    grid-template-columns: 1fr;\n  }\n\n  .hero.first {\n    grid-column: 1;\n    grid-row: auto;\n  }\n\n  .hero:not(.first) {\n    grid-column: 1;\n  }\n}`;

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
    numAds = 1,
    order = 'provider,text',
    headerElements = {},
    widthPx = null,
    heightPx = null,
    unitType = 'iab',
    model = 'gemini-2.5-flash',
    userNote = ''
  } = req.body || {};
  if (!imageBase64) { return res.status(400).json({ error: 'imageBase64 required' }); }

  const userNoteBlock = userNote
    ? `\n\nADDITIONAL CONTEXT FROM THE PERSON UPLOADING THIS SCREENSHOT:\n${userNote}\nTreat this as ground truth — e.g. if they say there are 10 ad slots, generate CSS assuming 10 slots even if you can only see a few in the visible screenshot area.`
    : '';

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
- Font sizes and image dimensions stay fixed at their base values; they do not scale per breakpoint
- If your desktop CSS individually targets specific slots (#dianomi_ad_N, .first, .last, :nth-child(), grid-row/grid-column overrides), and your one allowed fallback query flips flex-direction, also neutralise any grid-row/grid-column values on those same selectors inside that fallback query — otherwise a desktop-only grid span can survive into the column layout and overlap other content`
  : `Because this is Responsive:
- Add real breakpoints (768px and 480px minimum) that genuinely restructure the layout for smaller screens
- Stack horizontal layouts vertically on mobile
- Reduce font sizes at each breakpoint
- Adjust padding/gaps to be tighter on mobile
- This unit must look intentionally designed for phone screens, not just shrunk
- MANDATORY — if your desktop CSS targets specific slots individually (via #dianomi_ad_N, .first, .last, :nth-child(), or a grouped :is(...) selector — e.g. Pattern G/H/I/J or any per-slot custom sizing), a generic .hero rule inside your media query does NOT override those individually-targeted rules, because they are more specific. You MUST re-declare the SAME selector inside every breakpoint where its layout needs to change (e.g. .hero.first { grid-row: auto } to undo a desktop .hero.first { grid-row: 2 / span 3 }). Before finishing, list every non-uniform selector from your desktop CSS and confirm each one is explicitly reset or overridden at each breakpoint — do not assume a .hero/.wrapper fallback reaches them.`}`
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
0. LOCATE THE AD UNIT FIRST — the screenshot may be a tight crop of just the ad unit, OR a screenshot of an entire webpage with the Dianomi unit embedded somewhere within it. If the image shows navigation bars, article text, other unrelated content, or multiple distinct sections, this is a full-page capture — you must first locate the actual Dianomi unit within it before analysing anything else. Identify it by looking for: a heading label such as "Sponsored Content", "Advertisement", "Around the web", "Paid Content", "Paid Partner Content", or similar; AND/OR the Dianomi attribution mark (a small "D" icon, or the full "Dianomi" wordmark, usually near a corner of the unit). Once located, base your ENTIRE analysis (layout, typography, spacing, colours) only on that specific region — ignore the surrounding page content entirely. If you cannot confidently locate a distinct Dianomi unit in the image, proceed assuming the whole image is the unit.
1. Layout family — which of the 5 patterns in your instructions does this match closest, or is it a hybrid?
2. Count — exactly how many ad cards/items are visible?
3. Heading — is there a unit-level label (div.line2)? DO NOT default to a generic small-caps grey label. Read its ACTUAL typography from the screenshot: font family (serif/script/sans), size, weight, colour, letter-spacing, alignment, any border/divider. If it has TWO visually distinct lines (e.g. a large title plus a smaller italic/script subtitle), use a pseudo-element (.line2 .title::after with content) to render the second line — see the "Multi-line headings" technique in your instructions. Never skip or simplify a heading just because it's more complex than the reference examples. If a horizontal card grid is also present (multiple cards side by side), remember div.line2 MUST get width:100% or it will sit inline next to the first cards instead of spanning above the whole grid — flag this now so you don't forget it when writing the CSS.
4. Image — aspect ratio, corner treatment (sharp corners = no border-radius; slightly rounded = 4-8px; pill/very rounded = 12-20px; circular = 50%). Commit to a specific pixel value, do not skip this or leave it at browser default. Position relative to text (above/below/left/right), any visible gap between image and text.
5. Typography — is the headline serif or sans-serif? Estimate its font-size relative to the provider label. What colour is the headline? What colour and weight is the provider label — is it uppercase, does it have letter-spacing, does it have an underline or accent mark beneath it (small coloured bar, thin line)?
6. Spacing — estimate the outer padding of the wrapper in pixels by comparing to the image width. Estimate the gap between cards/items. Estimate the gap between image and text within a card.
7. Attribution — where does the Dianomi logo ("D" icon or full wordmark) sit? Six positions: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right. CRITICAL SPECIAL CASE: for inline/banner units (image-left, text-right, wide single-row cards) the "D" icon appears to float on the SAME horizontal axis as the provider text at the far right. This requires position:absolute; right:16px; top:50%; transform:translateY(-50%) on .sub-line2 — NOT bottom:0 which places it below the content line. Also add padding-right:48px to .wrapper to stop content overlapping the icon.
8. Background and dividers — is there a background colour other than white? Are there visible border lines between items, and what colour/weight?
9. Provider position relative to image — is the provider name inline with/beside the headline (normal case), OR does it appear as a separate label ABOVE both the image and headline (e.g. a brand name spanning the full card width, with the image and description below it)? If the latter, this requires the display:contents grid-breakout technique from your instructions — .text alone cannot achieve this because .dianomi_provider_short and .maintext are both trapped inside it by default.
10. Asymmetric height-matching — is there one clearly LARGER item beside a column of SMALLER items stacked on top of each other, where the large item's top and bottom edges line up with the top and bottom of the whole stack? If so, this is NOT a job for flexbox (flex items cannot be locked to match the combined height of several siblings in a different column). Use display:grid on .wrapper with the large item given grid-row: <start> / span <N>, and let the remaining items auto-place one per row in the other column — see the eighth reference example above.
11. Individually-targeted selectors and breakpoints — if this unit needs responsive/tablet/mobile treatment AND your desktop CSS targets specific slots individually (#dianomi_ad_N, .first, .last, :nth-child(), or a grouped :is(...) selector — e.g. any Pattern G/H/I/J layout), a generic .hero rule inside a media query will NOT override those individually-targeted rules because they carry higher specificity. Before finishing, list every non-uniform selector you used on desktop and confirm you have re-declared or overridden that SAME selector inside each breakpoint where its layout needs to change. This is the most common cause of a unit looking correct on desktop but breaking on tablet/mobile.

Only after reasoning through all 11 points, write the CSS. Match what you actually observed, not a generic default. Study the eight reference examples above for code quality and the correct selector patterns, but derive every specific value (colours, sizes, spacing) from THIS screenshot, not from the references.

FINAL REMINDERS before you write (these are the most commonly missed rules):
- Every CSS rule spans MULTIPLE LINES — selector, brace, one property per line, closing brace. Never one-line compressed rules. Match the exact formatting of the reference examples above.
- Each selector appears EXACTLY ONCE in your output.
- Use .hero img, never .dianomihref img.
- Use .dianomihref (short form), never .subhero a.dianomihref.
- body must always be height: auto; overflow-x: hidden; overflow-y: hidden; — NEVER overflow: visible and NEVER a fixed height. height:auto avoids clipping tall units; overflow-x/y:hidden is required separately because Dianomi's iframe embed measures body height before images/fonts necessarily finish loading, and with overflow:visible the late-arriving content spills out and produces a visible scrollbar on the live page (confirmed in production). This applies to every unit, not just ones you're told to make responsive.
- If cards sit side by side in a row, use .wrapper { display:flex; flex-direction:row; flex-wrap:wrap } — do not default to column.
- CRITICAL — if .wrapper is flex-direction:row AND a heading (div.line2) is present: div.line2 is a sibling of .hero inside .wrapper, so without an explicit width it will sit INLINE next to the first cards instead of spanning above them as a heading. You MUST add .line2 { width:100%; flex-shrink:0; } whenever .wrapper uses flex-direction:row.
- CRITICAL — for text-LEFT, thumbnail-RIGHT layouts: NEVER use order:1/order:2 on .text and .hero img. This creates specificity conflicts with global rules. Instead use flex-direction:row-reverse on .dianomihref — this physically puts img (first in DOM) on the right and .text (second in DOM) on the left with no order properties needed.
- Group repeated ID selectors with :is(#dianomi_ad_1, #dianomi_ad_2) instead of repeating full chains.
- No CSS comments, no markdown fences.

Be concise in the final output — 50-80 rules max, no commentary, just CSS.` + domNote + dimensionNote + userNoteBlock;

  // Multi-turn few-shot: show real screenshot → real production CSS pairs before asking for the new one
  const geminiBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT + '\n\nHere is a REFERENCE EXAMPLE. This screenshot shows a single-ad portrait Dianomi unit. Study it, then I will show you the exact production CSS that recreates it.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_1 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_1 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a SECOND REFERENCE EXAMPLE — a 5-item list unit (300x600 right rail), thumbnail-left layout with a heading label at top. This CSS represents solid structural defaults for this layout family (spacing scale, thumbnail sizing, typography hierarchy) — treat it as a strong starting pattern to adapt, not a pixel-exact match to copy blindly.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_2 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_2 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a THIRD REFERENCE EXAMPLE — a landscape single-ad unit (970x250 style), image left at fixed size, headline+provider+button stacked right, black CTA button reading "Read More". Study the image sizing, the button styling, and the flex-row layout.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_3 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_3 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a FOURTH REFERENCE EXAMPLE — a 2-column card grid with a large bold heading ABOVE the whole grid, and a small faint Dianomi logo bottom-right. Pay close attention to how the heading spans the FULL WIDTH above the cards rather than sitting inline with the first card — this is the .line2 width:100% technique.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_4 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_4 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a FIFTH REFERENCE EXAMPLE — a decorative two-line heading (large serif title + smaller italic script subtitle) and a list layout where the provider/brand name appears as a full-width label ABOVE the image and description, not beside them. Study how the heading uses a pseudo-element for the second line, and how the provider breaks out of the normal text column using the display:contents grid technique.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_5 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_5 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a SIXTH REFERENCE EXAMPLE — a 3-column grid with a large bold serif heading spanning full width above all cards. Each card has a full-width 16:9 image, bold serif headline below, small grey provider below that. Note the heading font is large and serif, very different from the small caps utility labels in other units.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_6 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_6 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: 'Here is a SEVENTH REFERENCE EXAMPLE — a multi-zone magazine layout on a grey background. Cards sit on white backgrounds. Small ALL-CAPS heading with a left border accent. Full Dianomi wordmark top-right (wide logo, not the small D icon). Provider label is small, uppercased, grey, above the headline. Study the card background color, the label style, and the logo variant carefully.' },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_7 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_7 }
        ]
      },
      {
        role: 'user',
        parts: [
          { text: "Here is an EIGHTH REFERENCE EXAMPLE — an asymmetric layout: one large single-ad item on the left (image above text, portrait style), paired with three compact stacked list items on the right (thumbnail left, text right), where the large item's height visually matches the combined height of all three stacked items. CRITICAL TECHNIQUE: this is built with CSS GRID, not flexbox. .wrapper uses display:grid with two columns. The first .hero gets grid-column:1; grid-row: 2 / span 3 so it explicitly spans the same vertical space as the three items stacked beside it. The remaining .hero elements only get grid-column:2 — grid auto-placement drops them into rows 1, 2, 3 automatically. Flexbox cannot make one sibling's height track several other siblings like this; only CSS Grid row-spanning can. Recognise this pattern whenever one clearly larger item sits beside a column of smaller evenly-stacked rows with matching top/bottom edges." },
          { inline_data: { mime_type: 'image/jpeg', data: REF_IMAGE_8 } }
        ]
      },
      {
        role: 'model',
        parts: [
          { text: REF_CSS_8 }
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
    generationConfig: Object.assign({
      temperature: 0.2,
      maxOutputTokens: 4000,
      topP: 0.95
    }, selectedModel.startsWith('gemini-2.5') ? {
      thinkingConfig: { thinkingBudget: thinkingBudgetByModel[selectedModel] || 1024 }
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
