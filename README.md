# Dianomi Subtype Tool

A live CSS preview and generation tool for Dianomi ad unit subtypes.

## Setup

1. Clone the repo
2. Connect to Vercel
3. Add environment variable in Vercel dashboard:
   ```
   OPENROUTER_API_KEY=your_key_here
   ```
4. Deploy

## Features

- Live CSS editor with syntax highlighting (CodeMirror)
- Accurate Dianomi DOM reconstruction for all unit families
- Unified presets (CSS + Header Html + controls in one click)
- Width and height sliders with breakpoint shortcuts
- Num Ads control (unlimited)
- Element Order toggle
- Maintext and provider character length selectors
- Screenshot → CSS via Gemini 2.0 Flash (vision model via OpenRouter)
- Download CSS / Download HTML
- Auto-save to localStorage

## Screenshot → CSS

Click **✦ Screenshot → CSS** in the preset bar, upload or paste a screenshot of a Dianomi unit design, and click Generate. Gemini reads the image and streams CSS directly into the editor using the correct Dianomi selectors.

## Architecture

```
/public/index.html     — the tool (static, no build step)
/api/generate-css.js   — Vercel Edge Function (proxies OpenRouter)
vercel.json            — routing
```

The API key never reaches the client. The edge function proxies the OpenRouter stream directly back to the browser.
