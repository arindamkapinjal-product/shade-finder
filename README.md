# Shade Finder

Paste a lipstick link or type a shade, and see it on your face in the live camera before you buy.

**Try it:** https://arindam-shade-finder.netlify.app

## What it does

- **Live try-on on your phone.** Face tracking (MediaPipe Face Landmarker) runs in the browser and paints the shade on your lips, keeping their natural texture.
- **Reads a product link.** A small serverless function fetches the product page and asks Gemini for the brand, shade and an approximate colour. If the page lists many shades and it can't tell which one you picked, it says so instead of guessing.
- **Tune the look.** Opacity, gloss, edge smoothing, saturation and brightness controls, plus example shades to start from.

## Privacy

Your camera feed and photos never leave your device. Only the text or link you type is sent to the AI.

## Safety and honesty

- Product pages are treated as untrusted data, and the page reader refuses to reach private or internal network addresses.
- Colours read from product pages are always labelled as approximate.
- The example shades are illustrative colours, not real products.

## Built with

Plain HTML and JavaScript, MediaPipe Tasks Vision, Netlify Functions (free tier), Google Gemini API (free tier), Node's built-in test runner.

Not affiliated with any brand. Screens and cameras show colours differently, so test shades in person before you buy.
