import { spawn } from 'node:child_process';
import { sanitizeEnv } from '../security/redact.js';
import { validateRepoPath } from '../security/paths.js';
import type { AskClaudeInput, ClaudeAdapter, ClaudeToolResult } from './types.js';

type AdapterOptions = {
  reposRoot: string;
  timeoutMs: number;
  maxBudgetUsd: number;
  allowEdits: boolean;
};

export function buildClaudeArgs(input: AskClaudeInput, maxBudgetUsd: number, allowEdits: boolean): string[] {
  const maxTurns = input.maxTurns ?? 2;
  if (input.allowEdits && !allowEdits) {
    throw new Error('Edits are disabled. Set ALLOW_CLAUDE_EDITS=true to enable.');
  }
  const prompt = `Intent: ${input.intent}\nQuestion: ${input.userQuestion}\nReturn concise markdown.`;
  return [
    '-p',
    prompt,
    '--output-format',
    'json',
    '--max-turns',
    String(maxTurns),
    '--permission-mode',
    'plan',
    '--max-budget-usd',
    String(maxBudgetUsd)
  ];
}

export class ClaudeCodeAdapter implements ClaudeAdapter {
  private readonly inFlight = new Map<string, boolean>();

  constructor(private readonly options: AdapterOptions) {}

  async ask(input: AskClaudeInput): Promise<ClaudeToolResult> {
    const repoPath = validateRepoPath(input.repoPath, this.options.reposRoot);
    if (this.inFlight.get(repoPath)) {
      return {
        ok: false,
        answer: '',
        elapsedMs: 0,
        repoPath,
        commandSummary: 'rejected: concurrent run',
        error: 'Another Claude run is already in progress for this repo.'
      };
    }

    this.inFlight.set(repoPath, true);
    const started = Date.now();
    const args = buildClaudeArgs(input, this.options.maxBudgetUsd, this.options.allowEdits);

    try {
      const result = await this.runCommand(repoPath, args);
      return {
        ok: true,
        answer: result,
        elapsedMs: Date.now() - started,
        repoPath,
        commandSummary: `claude ${args.join(' ')}`
      };
    } catch (error) {
      return {
        ok: false,
        answer: '',
        elapsedMs: Date.now() - started,
        repoPath,
        commandSummary: `claude ${args.join(' ')}`,
        error: error instanceof Error ? error.message : 'Unknown Claude error'
      };
    } finally {
      this.inFlight.delete(repoPath);
    }
  }

  private runCommand(repoPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('claude', args, {
        cwd: repoPath,
        env: sanitizeEnv(process.env),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Claude timed out after ${this.options.timeoutMs}ms.`));
      }, this.options.timeoutMs);

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(stderr || `claude exited with ${code}`));
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed.result ?? JSON.stringify(parsed));
        } catch {
          resolve(stdout.trim());
        }
      });
    });
  }
}
