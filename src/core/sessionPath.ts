import { homedir } from 'os';
import { join, basename, resolve, isAbsolute } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import type { SessionMetadata } from '../types';

export class SessionPath {
  private sessionRoot: string;
  private projectName: string;
  private timestamp: string;
  private sessionPath: string;

  constructor(projectPath?: string, timestamp?: string) {
    this.sessionRoot = process.env.DEVINE_HOME || join(homedir(), '.devine');
    this.projectName = this.deriveProjectName(projectPath || process.cwd());
    this.timestamp = timestamp || this.generateTimestamp();
    this.sessionPath = join(this.sessionRoot, 'sessions', this.projectName, this.timestamp);
  }

  private deriveProjectName(projectPath: string): string {
    // Try to get Git repository name
    try {
      const gitRemote = execSync('git config --get remote.origin.url', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      if (gitRemote) {
        // Extract repo name from git URL
        const match = gitRemote.match(/\/([^/]+?)(\.git)?$/);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch {
      // Not a git repository or git command failed
    }

    // Fall back to directory name
    return basename(resolve(projectPath));
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  getSessionPath(): string {
    return this.sessionPath;
  }

  getTimestamp(): string {
    return this.timestamp;
  }

  getStatePath(): string {
    return join(this.sessionPath, 'state');
  }

  getConfigPath(): string {
    return join(this.sessionPath, 'config.yml');
  }

  getMetadataPath(): string {
    return join(this.sessionPath, 'session_metadata.json');
  }

  getLogPath(): string {
    return join(this.sessionPath, 'session.log');
  }

  getJsonLogPath(): string {
    return join(this.sessionPath, 'session.log.json');
  }

  getMcpConfigPath(instanceName: string): string {
    return join(this.sessionPath, `${instanceName}.mcp.json`);
  }

  getInstanceStatePath(instanceId: string): string {
    return join(this.getStatePath(), `${instanceId}.json`);
  }

  getStartDirectoryPath(): string {
    return join(this.sessionPath, 'start_directory');
  }

  getWorktreePath(sessionId?: string): string {
    const worktreeSession = sessionId || this.timestamp;
    return join(this.sessionRoot, 'worktrees', worktreeSession);
  }

  ensureDirectories(): void {
    mkdirSync(this.sessionPath, { recursive: true });
    mkdirSync(this.getStatePath(), { recursive: true });
  }

  saveStartDirectory(directory: string): void {
    writeFileSync(this.getStartDirectoryPath(), directory, 'utf8');
  }

  loadStartDirectory(): string | null {
    const path = this.getStartDirectoryPath();
    if (existsSync(path)) {
      return readFileSync(path, 'utf8').trim();
    }
    return null;
  }

  saveMetadata(metadata: SessionMetadata): void {
    writeFileSync(this.getMetadataPath(), JSON.stringify(metadata, null, 2), 'utf8');
  }

  loadMetadata(): SessionMetadata | null {
    const path = this.getMetadataPath();
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf8')) as SessionMetadata;
      } catch {
        return null;
      }
    }
    return null;
  }

  static listSessions(projectPath?: string): Array<{
    timestamp: string;
    path: string;
    metadata: SessionMetadata | null;
  }> {
    const sessionRoot = process.env.DEVINE_HOME || join(homedir(), '.devine');
    const instance = new SessionPath(projectPath);
    const projectSessionsDir = join(sessionRoot, 'sessions', instance.projectName);

    if (!existsSync(projectSessionsDir)) {
      return [];
    }

    const sessions = readdirSync(projectSessionsDir)
      .filter((name) => {
        const fullPath = join(projectSessionsDir, name);
        return statSync(fullPath).isDirectory();
      })
      .map((timestamp) => {
        const sessionPath = join(projectSessionsDir, timestamp);
        const metadataPath = join(sessionPath, 'session_metadata.json');
        let metadata: SessionMetadata | null = null;

        if (existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as SessionMetadata;
          } catch {
            // Invalid metadata
          }
        }

        return {
          timestamp,
          path: sessionPath,
          metadata,
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return sessions;
  }

  static findSession(sessionIdOrPath: string, projectPath?: string): string | null {
    // If it's a full path and exists, return it
    if (isAbsolute(sessionIdOrPath) && existsSync(sessionIdOrPath)) {
      return sessionIdOrPath;
    }

    // Try to find by timestamp
    const sessions = SessionPath.listSessions(projectPath);
    const session = sessions.find((s) => s.timestamp === sessionIdOrPath);

    return session ? session.path : null;
  }

  static getCurrentSymlinkPath(): string {
    const sessionRoot = process.env.DEVINE_HOME || join(homedir(), '.devine');
    return join(sessionRoot, 'current');
  }

  createCurrentSymlink(): void {
    const symlinkPath = SessionPath.getCurrentSymlinkPath();

    // Remove existing symlink if it exists
    try {
      if (existsSync(symlinkPath)) {
        const stats = statSync(symlinkPath);
        if (stats.isSymbolicLink() || !stats.isDirectory()) {
          require('fs').unlinkSync(symlinkPath);
        }
      }
    } catch {
      // Ignore errors
    }

    // Create new symlink
    try {
      require('fs').symlinkSync(this.sessionPath, symlinkPath, 'dir');
    } catch {
      // Symlink creation might fail on some systems
    }
  }

  removeCurrentSymlink(): void {
    const symlinkPath = SessionPath.getCurrentSymlinkPath();
    try {
      if (existsSync(symlinkPath)) {
        require('fs').unlinkSync(symlinkPath);
      }
    } catch {
      // Ignore errors
    }
  }
}
