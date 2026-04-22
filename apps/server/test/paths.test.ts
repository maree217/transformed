import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateRepoPath } from '../src/security/paths.js';

describe('validateRepoPath', () => {
  it('accepts paths under repos root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repos-'));
    const repo = path.join(root, 'a');
    fs.mkdirSync(repo);
    expect(validateRepoPath(repo, root)).toBe(repo);
  });

  it('rejects traversal', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repos-'));
    expect(() => validateRepoPath(path.join(root, '..'), root)).toThrow(/outside/);
  });
});
