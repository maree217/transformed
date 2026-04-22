import fs from 'node:fs';
import path from 'node:path';

export function validateRepoPath(inputPath: string, reposRoot: string): string {
  if (!inputPath || inputPath.includes('\0')) {
    throw new Error('Invalid repo path.');
  }
  const resolvedRoot = path.resolve(reposRoot);
  const resolvedRepo = path.resolve(inputPath);
  const relative = path.relative(resolvedRoot, resolvedRepo);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Repo path is outside REPOS_ROOT.');
  }

  if (!fs.existsSync(resolvedRepo) || !fs.statSync(resolvedRepo).isDirectory()) {
    throw new Error('Repo path does not exist or is not a directory.');
  }

  return resolvedRepo;
}
