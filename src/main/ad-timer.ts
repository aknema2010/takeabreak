// Authoritative ad countdown. Lives in the MAIN process so the renderer cannot
// fast-forward the ad by tampering with its own JS / devtools. The renderer may
// only *play* the clip; this timer decides when the skip is actually granted.

export class AdTimer {
  private remaining = 0;
  private handle: NodeJS.Timeout | null = null;

  /**
   * Runs a one-second-resolution countdown.
   * @param seconds total ad length
   * @param onTick called every second with the remaining seconds
   * @param onComplete called once when the countdown reaches zero
   */
  start(
    seconds: number,
    onTick: (remaining: number) => void,
    onComplete: () => void,
  ): void {
    this.cancel();
    this.remaining = Math.max(0, Math.ceil(seconds));
    onTick(this.remaining);

    this.handle = setInterval(() => {
      this.remaining -= 1;
      onTick(Math.max(0, this.remaining));
      if (this.remaining <= 0) {
        this.cancel();
        onComplete();
      }
    }, 1000);
  }

  cancel(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}
