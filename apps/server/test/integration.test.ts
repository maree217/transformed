import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { MockClaudeAdapter } from '../src/claude/MockClaudeAdapter.js';

describe('POST /claude/ask integration', () => {
  it('returns mock response', async () => {
    const app = Fastify();
    const adapter = new MockClaudeAdapter();
    app.post('/claude/ask', async (req) => adapter.ask(req.body as any));

    const res = await app.inject({
      method: 'POST',
      url: '/claude/ask',
      payload: { repoPath: '/tmp/x', userQuestion: 'what', intent: 'search', allowEdits: false }
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.ok).toBe(true);
  });
});
