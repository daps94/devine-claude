import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, basename, resolve } from 'path';
import { createHash } from 'crypto';
import { executeCommand, isGitRepository, getGitCurrentBranch } from './system';
import { Logger } from './logger';

export interface WorktreeOptions {
  directory: string;
  worktreeName: string;
  basePath: string;
  logger?: Logger;
}

export interface WorktreeInfo {
  originalPath: string;
  worktreePath: string;
  worktreeName: string;
  repoHash: string;
  isGitRepo: boolean;
}

export class WorktreeManager {
  private worktrees: Map<string, WorktreeInfo> = new Map();
  private logger?: Logger;
  private basePath: string;

  constructor(basePath: string, logger?: Logger) {
    this.basePath = basePath;
    this.logger = logger;

    // Ensure base path exists
    mkdirSync(this.basePath, { recursive: true });
  }

  async setupWorktree(options: WorktreeOptions): Promise<string> {
    const { directory, worktreeName } = options;
    const resolvedDir = resolve(directory);

    // Check if it's a git repository
    if (!isGitRepository(resolvedDir)) {
      this.logger?.info(`Directory ${resolvedDir} is not a git repository, using as-is`);
      return resolvedDir;
    }

    // Get repository root
    const repoRoot = this.getRepositoryRoot(resolvedDir);

    // Generate hash for this repository
    const repoHash = this.generateRepoHash(repoRoot);

    // Construct worktree path
    const worktreePath = join(this.basePath, `${basename(repoRoot)}-${repoHash}`, worktreeName);

    // Check if worktree already exists
    if (existsSync(worktreePath)) {
      this.logger?.info(`Reusing existing worktree at ${worktreePath}`);
    } else {
      // Create worktree
      try {
        mkdirSync(join(this.basePath, `${basename(repoRoot)}-${repoHash}`), { recursive: true });

        const branch = getGitCurrentBranch(repoRoot) || 'main';
        executeCommand(`git worktree add "${worktreePath}" -b "${worktreeName}" "${branch}"`, {
          cwd: repoRoot,
        });

        this.logger?.info(`Created worktree at ${worktreePath}`);
      } catch (error) {
        this.logger?.error(`Failed to create worktree: ${error}`);
        throw error;
      }
    }

    // Track worktree
    const info: WorktreeInfo = {
      originalPath: resolvedDir,
      worktreePath,
      worktreeName,
      repoHash,
      isGitRepo: true,
    };

    this.worktrees.set(resolvedDir, info);

    // Calculate relative path from repo root to original directory
    const relativePath = this.getRelativePath(repoRoot, resolvedDir);

    // Return the equivalent path in the worktree
    return join(worktreePath, relativePath);
  }

  private getRepositoryRoot(directory: string): string {
    try {
      return executeCommand('git rev-parse --show-toplevel', { cwd: directory });
    } catch {
      return directory;
    }
  }

  private generateRepoHash(repoPath: string): string {
    return createHash('md5').update(repoPath).digest('hex').substring(0, 8);
  }

  private getRelativePath(from: string, to: string): string {
    const fromParts = resolve(from).split(/[/\\]/);
    const toParts = resolve(to).split(/[/\\]/);

    // Find common base
    let commonIndex = 0;
    while (
      commonIndex < fromParts.length &&
      commonIndex < toParts.length &&
      fromParts[commonIndex] === toParts[commonIndex]
    ) {
      commonIndex++;
    }

    // Build relative path
    const upCount = fromParts.length - commonIndex;
    const downPath = toParts.slice(commonIndex);

    const relativeParts: string[] = [];
    for (let i = 0; i < upCount; i++) {
      relativeParts.push('..');
    }
    relativeParts.push(...downPath);

    return relativeParts.length === 0 ? '.' : relativeParts.join('/');
  }

  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    for (const [originalPath, info] of this.worktrees) {
      if (!info.isGitRepo) continue;

      try {
        const repoRoot = this.getRepositoryRoot(originalPath);

        // Remove worktree from git
        try {
          executeCommand(`git worktree remove "${info.worktreePath}" --force`, {
            cwd: repoRoot,
          });
          this.logger?.info(`Removed worktree: ${info.worktreePath}`);
        } catch (error) {
          // Worktree might already be removed or corrupted
          this.logger?.warn(`Failed to remove worktree via git: ${error}`);

          // Force remove the directory
          if (existsSync(info.worktreePath)) {
            rmSync(info.worktreePath, { recursive: true, force: true });
            this.logger?.info(`Force removed worktree directory: ${info.worktreePath}`);
          }
        }

        // Prune worktree references
        try {
          executeCommand('git worktree prune', { cwd: repoRoot });
        } catch {
          // Ignore prune errors
        }
      } catch (error) {
        errors.push(error as Error);
        this.logger?.error(`Error cleaning up worktree for ${originalPath}: ${error}`);
      }
    }

    this.worktrees.clear();

    if (errors.length > 0) {
      throw new Error(
        `Failed to cleanup some worktrees: ${errors.map((e) => e.message).join(', ')}`,
      );
    }
  }

  getWorktreeInfo(directory: string): WorktreeInfo | undefined {
    return this.worktrees.get(resolve(directory));
  }

  getAllWorktrees(): WorktreeInfo[] {
    return Array.from(this.worktrees.values());
  }

  mapPathToWorktree(path: string): string {
    const resolved = resolve(path);

    // Check if this path is under any tracked directory
    for (const [originalPath, info] of this.worktrees) {
      if (resolved.startsWith(originalPath)) {
        const relativePath = resolved.substring(originalPath.length);
        return join(info.worktreePath, relativePath);
      }
    }

    return path;
  }
}
