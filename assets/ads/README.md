# Bundled ad clips

Drop the bundled advertisement clip here as `sample.mp4` (the break window loads
`assets/ads/sample.mp4`).

The clip is **optional**: if `sample.mp4` is absent (or fails to load/autoplay),
the break window falls back to a built-in animated "house ad" so the app works
out of the box. A real clip is shown only once it successfully loads.

For v1 this is a single local clip shipped with the app — no network or ad
network is involved. The 5-second skip gate is enforced by the **main process**
(`src/main/ad-timer.ts`), so the clip's own length or load state cannot shorten
it; the video is purely what the user sees.

To swap in a real ad network later, replace the `<video>` in
`src/renderer/break/index.html` with a VAST/web ad tag — the main-process timer
contract stays the same.
