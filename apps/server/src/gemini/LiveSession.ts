import { GoogleGenAI } from '@google/genai';
import type { WebSocket } from '@fastify/websocket';
import { geminiTools, systemInstruction } from './tools.js';
import type { ClaudeAdapter } from '../claude/types.js';
import { LatencyTracker } from '../metrics/latency.js';
import { askClaudeSchema } from './tools.js';
import { RepoRegistry } from '../repos/RepoRegistry.js';

type LiveSessionDeps = {
  socket: WebSocket;
  claude: ClaudeAdapter;
  repos: RepoRegistry;
  selectedRepo?: string;
};

export class LiveSession {
  private tracker = new LatencyTracker();
  private selectedRepo?: string;

  constructor(private readonly deps: LiveSessionDeps) {
    this.selectedRepo = deps.selectedRepo;
  }

  async start(): Promise<void> {
    if (process.env.USE_MOCK_GEMINI === 'true') {
      this.mockLoop();
      return;
    }

    const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY });
    // SDK evolves quickly; this block is intentionally thin and easy to replace.
    const model = process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.1-flash-live-preview';

    this.deps.socket.send(JSON.stringify({ type: 'status', status: 'connecting', model }));
    this.deps.socket.send(
      JSON.stringify({
        type: 'info',
        message:
          'Live Gemini wiring placeholder enabled. Set USE_MOCK_GEMINI=true for deterministic local/CI behavior.'
      })
    );

    void client;
    void geminiTools;
    void systemInstruction;
  }

  private mockLoop(): void {
    this.deps.socket.on('message', async (raw: unknown) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'audio_chunk') {
        this.tracker.mark('micChunkSentAt');
      }
      if (msg.type === 'user_text') {
        const text = String(msg.text ?? '');
        this.deps.socket.send(JSON.stringify({ type: 'transcript', role: 'user', text }));
        if (/repo|file|test|route|database|auth|refactor/i.test(text)) {
          this.tracker.mark('geminiToolCallAt');
          this.deps.socket.send(JSON.stringify({ type: 'status', status: 'tool-running' }));
          const parsed = askClaudeSchema.parse({
            repoPath: this.selectedRepo ?? msg.repoPath,
            userQuestion: text,
            intent: 'search',
            allowEdits: false,
            maxTurns: 2
          });
          this.tracker.mark('claudeStartAt');
          const result = await this.deps.claude.ask(parsed);
          this.tracker.mark('claudeEndAt');
          this.deps.socket.send(JSON.stringify({ type: 'tool_result', tool: 'ask_claude_code', result }));
          this.deps.socket.send(
            JSON.stringify({
              type: 'transcript',
              role: 'assistant',
              text: `I inspected the repo. ${result.ok ? result.answer : result.error}`
            })
          );
        } else {
          this.deps.socket.send(
            JSON.stringify({
              type: 'transcript',
              role: 'assistant',
              text: 'Quick answer: this sounds conceptual, so no repo inspection needed. Want details?'
            })
          );
        }
        this.tracker.mark('finalSpokenAt');
        this.deps.socket.send(JSON.stringify({ type: 'metrics', metrics: this.tracker.snapshot() }));
      }
      if (msg.type === 'select_repo') {
        this.selectedRepo = this.deps.repos.selectRepo(msg.repoPath);
      }
      if (msg.type === 'interrupt') {
        this.deps.socket.send(JSON.stringify({ type: 'interrupted', clearPlayback: true }));
      }
    });
  }
}
