import { execSync, ExecSyncOptions } from 'child_process';
import { platform } from 'os';

export function commandExists(command: string): boolean {
  try {
    const checkCommand = platform() === 'win32' ? 'where' : 'command -v';
    execSync(`${checkCommand} ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function executeCommand(command: string, options?: ExecSyncOptions): string {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      ...options,
    });
    return typeof result === 'string' ? result.trim() : result.toString().trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

export function isGitRepository(path: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: path,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function getGitRemoteUrl(path: string): string | null {
  try {
    return executeCommand('git config --get remote.origin.url', { cwd: path });
  } catch {
    return null;
  }
}

export function getGitCurrentBranch(path: string): string | null {
  try {
    return executeCommand('git rev-parse --abbrev-ref HEAD', { cwd: path });
  } catch {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function parseSessionId(sessionId: string): Date | null {
  // Parse format: YYYYMMDD_HHMMSS
  const match = sessionId.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year!),
    parseInt(month!) - 1,
    parseInt(day!),
    parseInt(hour!),
    parseInt(minute!),
    parseInt(second!),
  );
}

export function isAbsolutePath(path: string): boolean {
  if (platform() === 'win32') {
    // Windows absolute path: C:\ or \\server\share
    return /^[a-zA-Z]:[\\\/]/.test(path) || /^\\\\/.test(path);
  } else {
    // Unix absolute path: starts with /
    return path.startsWith('/');
  }
}

export function expandHomeDir(path: string): string {
  if (path.startsWith('~/')) {
    return path.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '');
  }
  return path;
}
