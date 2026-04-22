import fs from 'node:fs';
import path from 'node:path';
import { validateRepoPath } from '../security/paths.js';

export class RepoRegistry {
  constructor(private readonly reposRoot: string, private readonly allowedReposEnv?: string) {}

  listAllowedRepos(): string[] {
    if (this.allowedReposEnv) {
      return this.allowedReposEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((repo) => validateRepoPath(path.join(this.reposRoot, repo), this.reposRoot));
    }

    return fs
      .readdirSync(this.reposRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(this.reposRoot, d.name));
  }

  selectRepo(repoPath: string): string {
    return validateRepoPath(repoPath, this.reposRoot);
  }
}
