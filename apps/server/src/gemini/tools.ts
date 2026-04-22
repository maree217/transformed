import { z } from 'zod';

export const askClaudeSchema = z.object({
  repoPath: z.string(),
  userQuestion: z.string(),
  intent: z.enum(['explain', 'debug', 'search', 'plan', 'edit_proposal', 'other']),
  allowEdits: z.boolean().default(false),
  maxTurns: z.number().int().min(1).max(8).optional()
});

export const selectRepoSchema = z.object({ repoPath: z.string() });

export const geminiTools = [
  {
    name: 'ask_claude_code',
    description: 'Inspect selected local repository through Claude Code.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        repoPath: { type: 'string' },
        userQuestion: { type: 'string' },
        intent: {
          type: 'string',
          enum: ['explain', 'debug', 'search', 'plan', 'edit_proposal', 'other']
        },
        allowEdits: { type: 'boolean' },
        maxTurns: { type: 'number' }
      },
      required: ['repoPath', 'userQuestion', 'intent', 'allowEdits']
    }
  },
  {
    name: 'list_allowed_repos',
    description: 'List repos user can select.',
    parametersJsonSchema: { type: 'object', properties: {} }
  },
  {
    name: 'select_repo',
    description: 'Select active repository path.',
    parametersJsonSchema: {
      type: 'object',
      properties: { repoPath: { type: 'string' } },
      required: ['repoPath']
    }
  }
];

export const systemInstruction = `You are a voice interface for a developer working on local code.
Speak concisely.
Use Claude Code only when local repo inspection is required.
Do not pretend you inspected files unless you called ask_claude_code.
For quick conceptual questions, answer directly.
For repo-specific questions, call ask_claude_code with the selected repo path.
When the user asks to edit code, first create a plan. Do not modify files unless allowEdits is true and user explicitly authorizes edits.
Keep spoken answers short, then ask whether the user wants deeper detail.
When Claude Code returns a long answer, summarize it for voice and include the full text in the UI transcript.`;
