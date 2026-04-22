import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildClaudeArgs, ClaudeCodeAdapter } from '../src/claude/ClaudeCodeAdapter.js';
import { MockClaudeAdapter } from '../src/claude/MockClaudeAdapter.js';

describe('claude args', () => {
  it('builds expected command args', () => {
    const args = buildClaudeArgs(
      { repoPath: '/tmp/x', userQuestion: 'what?', intent: 'search', allowEdits: false, maxTurns: 3 },
      1,
      false
    );
    expect(args).toContain('--output-format');
    expect(args).toContain('json');
    expect(args).toContain('--permission-mode');
    expect(args).toContain('plan');
  });

  it('rejects edits when disabled', () => {
    expect(() =>
      buildClaudeArgs({ repoPath: '/tmp/x', userQuestion: 'edit', intent: 'edit_proposal', allowEdits: true }, 1, false)
    ).toThrow(/disabled/);
  });
});

describe('mock claude', () => {
  it('returns structured result shape', async () => {
    const mock = new MockClaudeAdapter();
    const result = await mock.ask({ repoPath: '/tmp/x', userQuestion: 'hi', intent: 'other', allowEdits: false });
    expect(result.ok).toBe(true);
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.commandSummary).toContain('mock');
  });
});

describe('concurrency guard', () => {
  it('rejects concurrent runs for same repo', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repos-'));
    const repo = path.join(root, 'r1');
    fs.mkdirSync(repo);
    const adapter = new ClaudeCodeAdapter({ reposRoot: root, timeoutMs: 20, maxBudgetUsd: 1, allowEdits: false });

    const r1 = adapter.ask({ repoPath: repo, userQuestion: 'a', intent: 'search', allowEdits: false });
    const r2 = adapter.ask({ repoPath: repo, userQuestion: 'b', intent: 'search', allowEdits: false });

    const second = await r2;
    expect(second.ok).toBe(false);
    await r1.catch(() => undefined);
  });
});
