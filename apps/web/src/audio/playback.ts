export class PlaybackQueue {
  private audioCtx = new AudioContext({ sampleRate: 24000 });
  private queue: Int16Array[] = [];
  private playing = false;

  enqueuePcm16(chunk: ArrayBuffer): void {
    this.queue.push(new Int16Array(chunk));
    void this.pump();
  }

  clear(): void {
    this.queue = [];
  }

  private async pump(): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;
      const float = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i += 1) {
        float[i] = chunk[i] / 0x7fff;
      }
      const buffer = this.audioCtx.createBuffer(1, float.length, 24000);
      buffer.copyToChannel(float, 0);
      const src = this.audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.audioCtx.destination);
      src.start();
      await new Promise((r) => (src.onended = () => r(undefined)));
    }
    this.playing = false;
  }
}
