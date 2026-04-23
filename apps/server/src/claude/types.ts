export type ClaudeIntent = 'explain' | 'debug' | 'search' | 'plan' | 'edit_proposal' | 'other';

export type AskClaudeInput = {
  repoPath: string;
  userQuestion: string;
  intent: ClaudeIntent;
  allowEdits: boolean;
  maxTurns?: number;
};

export type ClaudeToolResult = {
  ok: boolean;
  answer: string;
  elapsedMs: number;
  repoPath: string;
  commandSummary: string;
  error?: string;
};

export interface ClaudeAdapter {
  ask(input: AskClaudeInput): Promise<ClaudeToolResult>;
}
