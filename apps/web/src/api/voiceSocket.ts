export type VoiceMessage =
  | { type: 'status'; status: string }
  | { type: 'transcript'; role: 'user' | 'assistant'; text: string }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'metrics'; metrics: Record<string, number> }
  | { type: 'interrupted'; clearPlayback: boolean }
  | { type: 'info'; message: string };

export class VoiceSocket {
  private ws?: WebSocket;

  connect(onMessage: (msg: VoiceMessage) => void): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.hostname}:8787/voice`);
    this.ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  }

  send(payload: object): void {
    this.ws?.send(JSON.stringify(payload));
  }

  close(): void {
    this.ws?.close();
  }
}
