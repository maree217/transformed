import { useMemo, useState } from 'react';
import { startMicCapture, type MicController } from './audio/capture';
import { PlaybackQueue } from './audio/playback';
import { VoiceSocket, type VoiceMessage } from './api/voiceSocket';

type TranscriptItem = { role: string; text: string; full?: string };

export function App() {
  const [status, setStatus] = useState('disconnected');
  const [repoPath, setRepoPath] = useState('');
  const [modelName, setModelName] = useState('gemini-3.1-flash-live-preview');
  const [voiceName, setVoiceName] = useState('Kore');
  const [useMockClaude, setUseMockClaude] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const playback = useMemo(() => new PlaybackQueue(), []);
  const socket = useMemo(() => new VoiceSocket(), []);
  const [mic, setMic] = useState<MicController | null>(null);

  const onMessage = (msg: VoiceMessage) => {
    if (msg.type === 'status') setStatus(msg.status);
    if (msg.type === 'transcript') setTranscript((t) => [...t, { role: msg.role, text: msg.text }]);
    if (msg.type === 'tool_result') {
      setTranscript((t) => [
        ...t,
        { role: 'tool', text: 'Claude Code is inspecting repo...', full: JSON.stringify(msg.result, null, 2) }
      ]);
    }
    if (msg.type === 'metrics') setMetrics(msg.metrics);
    if (msg.type === 'interrupted' && msg.clearPlayback) playback.clear();
  };

  const start = async () => {
    setStatus('connecting');
    socket.connect(onMessage);
    socket.send({ type: 'select_repo', repoPath });
    socket.send({ type: 'settings', modelName, voiceName, useMockClaude });

    const micCtrl = await startMicCapture((chunk) => {
      socket.send({ type: 'audio_chunk', pcm16: Array.from(new Uint8Array(chunk)) });
    });
    setMic(micCtrl);
    setStatus('listening');
  };

  const stop = () => {
    mic?.stop();
    setMic(null);
    socket.close();
    setStatus('disconnected');
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto' }}>
      <h1>local-voice-claude-repo-bot</h1>
      <p>Status: <strong>{status}</strong></p>

      <section>
        <h3>Repository</h3>
        <input value={repoPath} onChange={(e) => setRepoPath(e.target.value)} placeholder="/Users/me/code/project" style={{ width: '100%' }} />
      </section>

      <section>
        <h3>Settings</h3>
        <label>Model <input value={modelName} onChange={(e) => setModelName(e.target.value)} /></label>{' '}
        <label>Voice <input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} /></label>{' '}
        <label>
          <input type="checkbox" checked={useMockClaude} onChange={(e) => setUseMockClaude(e.target.checked)} />
          Use mock Claude adapter
        </label>
      </section>

      <section>
        <button onClick={start}>Start Conversation</button>
        <button onClick={stop}>Stop</button>
        <button onClick={() => socket.send({ type: 'interrupt' })}>Interrupt</button>
        <button onClick={() => socket.send({ type: 'user_text', text: 'What does this repo do?', repoPath })}>Send test text</button>
      </section>

      <section>
        <h3>Transcript</h3>
        <ul>
          {transcript.map((item, idx) => (
            <li key={idx}>
              <strong>{item.role}:</strong> {item.text}
              {item.full && <details><summary>Full output</summary><pre>{item.full}</pre></details>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Debug Latency Panel</h3>
        <pre>{JSON.stringify(metrics, null, 2)}</pre>
      </section>
    </main>
  );
}
