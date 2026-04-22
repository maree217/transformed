# local-voice-claude-repo-bot (MVP)

A local-first voice app where **Gemini Live** handles the real-time voice loop and **Claude Code CLI** is only invoked for repo-specific questions.

## 1) What this is

- TypeScript monorepo with:
  - `apps/web` (Vite + React UI)
  - `apps/server` (Node + TypeScript + Fastify + WebSocket)
- Browser captures mic audio and plays assistant audio.
- Server owns `.env` secrets and mediates model/tool calls.
- Claude integration is adapter-based, with a real CLI adapter and a mock adapter for cloud/CI.

## 2) Architecture diagram (text)

```text
[Browser: React + WebAudio]
  - mic capture (PCM16)
  - playback queue
  - transcript + status + debug metrics
      |
      | WS /voice + HTTP
      v
[Local Node Server: Fastify]
  - /repos /repos/select /claude/ask /voice
  - Gemini Live session manager
  - tool router (ask_claude_code, list_allowed_repos, select_repo)
  - latency metrics
      |
      +--> [Gemini Live: gemini-3.1-flash-live-preview]
      |
      +--> [Local Claude CLI via spawn("claude", ...)] in selected repo cwd
```

## 3) Why Gemini Live + Claude split

- Gemini Live is optimized for low-latency streaming voice I/O.
- Claude Code is optimized for local repository understanding and coding workflows.
- Calling Claude only on repo-local questions keeps latency and cost under control.

## 4) Why Codex cloud uses mock Claude integration

Codex/cloud agents cannot assume your Mac-local `claude` binary, repo filesystem, or local auth context exist. This MVP includes `USE_MOCK_CLAUDE=true` and `USE_MOCK_GEMINI=true` modes so the same codebase is testable in cloud and runnable locally on Mac.

## 5) MacBook Air M3 setup

1. Install Node 22+.
2. Install pnpm (`npm i -g pnpm`).
3. Install Claude Code CLI.
4. Authenticate Claude Code CLI.
5. Verify Claude CLI:
   ```bash
   claude -p "Summarize this project" --output-format json
   ```
6. Set env vars in `.env`:
   - `REPOS_ROOT=/Users/you/code`
   - `GOOGLE_API_KEY=...` (or `GEMINI_API_KEY=...`)
   - optional overrides (`GEMINI_LIVE_MODEL`, `GEMINI_VOICE_NAME`)
7. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```
8. Open web app (Vite URL), choose repo, start conversation.

## 6) Security notes

- Never expose API keys to browser; server keeps secrets.
- Repo path validation constrains all paths under `REPOS_ROOT`.
- Read-only behavior by default (`--permission-mode plan`, `allowEdits=false`).
- No shell interpolation; Claude adapter uses `spawn("claude", args)`.
- Logs/env output should redact secrets (`KEY`, `TOKEN`, `SECRET`, `PASSWORD`, plus known keys).

## 7) Latency notes

- Direct Gemini voice loop minimizes round-trips.
- Claude tool calls add latency and should be used only when needed.
- Metrics captured:
  - mic chunk sent
  - Gemini first audio
  - Gemini tool call
  - Claude start/end
  - final spoken answer
- Local STT/TTS fallback is intentionally future work.

## 8) Troubleshooting

- **Microphone denied**: allow mic permissions in browser/system settings.
- **Claude CLI not found**: ensure `claude` is installed and on PATH.
- **Gemini API key missing**: set `GOOGLE_API_KEY` or `GEMINI_API_KEY` in `.env`.
- **Audio sample-rate artifacts**: check capture/playback PCM assumptions and browser sample rate.
- **Tool timeout**: increase `CLAUDE_TIMEOUT_MS`.

## Audio format assumptions (MVP)

- PCM 16-bit little-endian chunks.
- Client captures from browser sample rate and converts to int16.
- Chunk target is ~20–40ms for realtime streaming (currently approximate; tune in production).

## API surface

- `GET /health`
- `GET /repos`
- `POST /repos/select`
- `POST /claude/ask`
- `WS /voice`

## Env flags

- `GEMINI_LIVE_MODEL` default `gemini-3.1-flash-live-preview`
- `GEMINI_VOICE_NAME` default `Kore`
- `USE_MOCK_GEMINI=true|false`
- `USE_MOCK_CLAUDE=true|false`
- `ALLOW_CLAUDE_EDITS=true|false`
- `CLAUDE_TIMEOUT_MS` default `120000`
- `CLAUDE_MAX_BUDGET_USD` default `1.00`

## TODOs

- Direct browser-to-Gemini mode using ephemeral tokens.
- Local STT/TTS benchmark mode.
- Edit mode with explicit user confirmation + write guards.
- MCP server alternative for repo querying.
- Native Mac menubar wrapper.
