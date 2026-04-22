import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { z } from 'zod';
import { RepoRegistry } from './repos/RepoRegistry.js';
import { ClaudeCodeAdapter } from './claude/ClaudeCodeAdapter.js';
import { MockClaudeAdapter } from './claude/MockClaudeAdapter.js';
import { LiveSession } from './gemini/LiveSession.js';
import type { ClaudeAdapter } from './claude/types.js';

const port = Number(process.env.PORT ?? 8787);
const reposRoot = process.env.REPOS_ROOT ?? process.cwd();
const repoRegistry = new RepoRegistry(reposRoot, process.env.ALLOWED_REPOS);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocket);

const adapter: ClaudeAdapter = process.env.USE_MOCK_CLAUDE === 'true'
  ? new MockClaudeAdapter()
  : new ClaudeCodeAdapter({
      reposRoot,
      timeoutMs: Number(process.env.CLAUDE_TIMEOUT_MS ?? 120000),
      maxBudgetUsd: Number(process.env.CLAUDE_MAX_BUDGET_USD ?? 1.0),
      allowEdits: process.env.ALLOW_CLAUDE_EDITS === 'true'
    });

app.get('/health', async () => ({ ok: true }));
app.get('/repos', async () => ({ repos: repoRegistry.listAllowedRepos() }));

app.post('/repos/select', async (req) => {
  const body = z.object({ repoPath: z.string() }).parse(req.body);
  return { repoPath: repoRegistry.selectRepo(body.repoPath) };
});

app.post('/claude/ask', async (req, reply) => {
  const body = z
    .object({
      repoPath: z.string(),
      userQuestion: z.string(),
      intent: z.enum(['explain', 'debug', 'search', 'plan', 'edit_proposal', 'other']).default('other'),
      allowEdits: z.boolean().default(false),
      maxTurns: z.number().optional()
    })
    .parse(req.body);

  const result = await adapter.ask(body);
  if (!result.ok) {
    reply.code(400);
  }
  return result;
});

app.get('/voice', { websocket: true }, (connection) => {
  const session = new LiveSession({
    socket: connection,
    claude: adapter,
    repos: repoRegistry
  });
  void session.start();
});

await app.listen({ port, host: '0.0.0.0' });
