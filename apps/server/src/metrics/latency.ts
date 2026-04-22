export type LatencySnapshot = {
  micChunkSentAt?: number;
  geminiFirstAudioAt?: number;
  geminiToolCallAt?: number;
  claudeStartAt?: number;
  claudeEndAt?: number;
  finalSpokenAt?: number;
};

export class LatencyTracker {
  private data: LatencySnapshot = {};

  mark<K extends keyof LatencySnapshot>(key: K): void {
    this.data[key] = Date.now();
  }

  reset(): void {
    this.data = {};
  }

  snapshot(): LatencySnapshot {
    return { ...this.data };
  }
}
