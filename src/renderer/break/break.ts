// Break-window controller. Drives two views — the break countdown and the ad
// gate — but never decides when a skip is granted: the main process owns the
// authoritative ad timer and tells us when it's done.

const breakView = document.getElementById('break-view')!;
const adView = document.getElementById('ad-view')!;
const breakCountdown = document.getElementById('break-countdown')!;
const skipBtn = document.getElementById('skip-btn') as HTMLButtonElement;
const strictNote = document.getElementById('strict-note')!;
const adVideo = document.getElementById('ad-video') as HTMLVideoElement;
const adRemaining = document.getElementById('ad-remaining')!;

window.api.onBreakStart((p) => {
  if (p.strictMode) {
    strictNote.hidden = false;
  } else {
    skipBtn.hidden = false;
  }
});

window.api.onBreakTick((remaining) => {
  breakCountdown.textContent = String(remaining);
});

skipBtn.addEventListener('click', () => {
  skipBtn.disabled = true;
  window.api.requestSkip();
});

// Main approved the skip path and wants the ad to play.
window.api.onAdShow(() => {
  breakView.hidden = true;
  adView.hidden = false;
  // Tell main the clip is rolling, then start the bundled video. Main starts
  // its authoritative countdown on receiving this — the video ending early or
  // failing to load cannot shorten the gate.
  window.api.adStarted();
  adVideo.play().catch(() => {
    /* No clip / autoplay blocked — the main-process timer still governs. */
  });
});

window.api.onAdTick((remaining) => {
  adRemaining.textContent = String(remaining);
});

window.api.onAdComplete(() => {
  // Main will close the window; just stop playback cleanly.
  adVideo.pause();
});
