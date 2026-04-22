const DEFAULT_SECRET_KEYS = [
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GITHUB_TOKEN'
];

const GENERIC_PATTERNS = ['KEY', 'TOKEN', 'SECRET', 'PASSWORD'];

export function shouldRedactKey(key: string): boolean {
  const upper = key.toUpperCase();
  return DEFAULT_SECRET_KEYS.includes(upper) || GENERIC_PATTERNS.some((p) => upper.includes(p));
}

export function redactEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const clone: NodeJS.ProcessEnv = { ...env };
  for (const [key, value] of Object.entries(clone)) {
    if (value && shouldRedactKey(key)) {
      clone[key] = '***REDACTED***';
    }
  }
  return clone;
}

export function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const blocked = ['npm_config_user_agent'];
  const next: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(env)) {
    if (!blocked.includes(k)) {
      next[k] = v;
    }
  }
  return next;
}
