import type { TakeABreakApi } from '../preload/preload';

declare global {
  interface Window {
    api: TakeABreakApi;
  }
}

export {};
