# local-voice-claude-repo-bot agent notes

- Keep MVP local-first and mock-friendly for cloud CI.
- Never shell-interpolate user prompts; use spawn argv arrays only.
- Default to read-only Claude runs unless ALLOW_CLAUDE_EDITS=true.
