import type { AskClaudeInput, ClaudeAdapter, ClaudeToolResult } from './types.js';

export class MockClaudeAdapter implements ClaudeAdapter {
  async ask(input: AskClaudeInput): Promise<ClaudeToolResult> {
    const started = Date.now();
    await new Promise((r) => setTimeout(r, 30));
    return {
      ok: true,
      answer: `[mock claude] ${input.intent}: ${input.userQuestion}`,
      elapsedMs: Date.now() - started,
      repoPath: input.repoPath,
      commandSummary: 'mock: claude not executed'
    };
  }
}
