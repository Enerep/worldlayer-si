# WorldLayer.si — The procedural atlas

An interactive exhibition of places that do not exist. Visitors can generate a terrain, switch between Alpine, Dune and Lunar biomes, orbit the landscape, separate its geological layers, and save a postcard. The domain is available for acquisition through a small inquiry link.

The site is buildless HTML, CSS and JavaScript. There are no npm dependencies, external scripts, analytics, or remote scene assets. Licensed copies of Space Grotesk and IBM Plex Mono are self-hosted; their OFL licenses are included in `public/fonts`.

## Preview

Run `python3 preview.py`, then open **http://127.0.0.1:4312**. The server exposes only `public` and applies the security headers in `vercel.json`.

## Interaction

- Drag the landscape to orbit; scroll over it to zoom.
- Use the biome buttons or press **1**, **2**, or **3**.
- Choose **Make another world** or press **N** to generate another seed.
- The layer slider separates the three geological plates.
- With the landscape focused, the arrow keys rotate the camera and **Home** resets it.
- The camera control downloads a PNG postcard. The pause control stops ambient rotation and float.
- **Field notes** explains the experiment and controls.

The seeded terrain uses a native WebGL heightfield, fractal and ridged noise, custom lighting, elevation contours, and a smooth geometry transition between worlds. Geometry is calculated in the vertex shader. If WebGL is unavailable, a 2D generated landscape replaces it. Terrain and names are imaginary; this is not geographic data.

Motion respects `prefers-reduced-motion`, pauses when the canvas is offscreen or the page is hidden, and can be paused manually. Keyboard controls, semantic landmarks, focus indicators and native modal dialogs are included.

## Contact

The public contact address is `batcontact.help@gmail.com`, configured in `public/config.js`. Never put credentials in this file.

The inquiry form prepares a reviewable draft locally, then offers an email-app link, Gmail, and copy/download options. The website does not send or store inquiries, take payments, or transfer domains.

## Files

- `public/index.html`: exhibition layout, metadata, field notes and inquiry dialog.
- `public/styles.css`: responsive editorial layout and typography.
- `public/scene.js`: procedural terrain, native WebGL renderer, gestures and postcard export.
- `public/site.js`: world controls, keyboard shortcuts and inquiry drafting.
- `vercel.json`: static output and security headers.

## Deployment

The existing Vercel configuration serves `public` without an install or build step. Push to your repository and deploy through its configured Vercel project when ready.
