import { describe, expect, it } from 'vitest';
import { shouldRedactKey, redactEnv } from '../src/security/redact.js';

describe('redaction', () => {
  it('redacts common secret keys', () => {
    expect(shouldRedactKey('GEMINI_API_KEY')).toBe(true);
    expect(shouldRedactKey('db_password')).toBe(true);
    expect(shouldRedactKey('PATH')).toBe(false);
  });

  it('redacts env values', () => {
    const out = redactEnv({ GEMINI_API_KEY: 'abc', HELLO: '1' });
    expect(out.GEMINI_API_KEY).toBe('***REDACTED***');
    expect(out.HELLO).toBe('1');
  });
});
