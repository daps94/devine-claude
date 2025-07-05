import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, renameSync } from 'fs';
import { join, dirname, resolve, basename, normalize } from 'path';
import { createHash } from 'crypto';
import { homedir } from 'os';
import * as lockfile from 'proper-lockfile';

// Define strict interfaces for type safety
export interface AgentContext {
  version: string;
  timestamp: string;
  agentName: string;
  data: Record<string, unknown>;
}

export interface SharedFinding {
  id: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'vulnerability' | 'performance' | 'test-gap' | 'architecture';
  affected: string[];
  summary: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface FindingFilter {
  severity?: SharedFinding['severity'];
  type?: SharedFinding['type'];
  source?: string;
  since?: string;
}

// Error classes for better error handling
export class ContextError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ContextError';
  }
}

export class ValidationError extends ContextError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class SecurityError extends ContextError {
  constructor(message: string, details?: any) {
    super(message, 'SECURITY_ERROR', details);
  }
}

export class SecureContextManager {
  private readonly analysisRoot: string;
  private readonly contextDir: string;
  private readonly sessionsDir: string;
  private readonly sharedDir: string;
  private readonly projectPath: string;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB limit
  private readonly allowedAgentNamePattern = /^[a-zA-Z0-9-_]+$/;
  private readonly contextVersion = '1.0';

  constructor(projectPath: string) {
    this.projectPath = resolve(projectPath);
    this.analysisRoot = join(this.projectPath, '.analysis');
    this.contextDir = join(this.analysisRoot, 'context');
    this.sessionsDir = join(this.analysisRoot, 'sessions');
    this.sharedDir = join(this.analysisRoot, 'shared');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    // Create directories with restricted permissions
    const dirs = [this.analysisRoot, this.contextDir, this.sessionsDir, this.sharedDir];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    }
  }

  // Input validation methods
  private validateAgentName(agentName: string): void {
    if (!agentName || typeof agentName !== 'string') {
      throw new ValidationError('Agent name must be a non-empty string');
    }

    if (!this.allowedAgentNamePattern.test(agentName)) {
      throw new ValidationError(
        'Agent name can only contain letters, numbers, hyphens, and underscores',
        { agentName },
      );
    }

    if (agentName.length > 100) {
      throw new ValidationError('Agent name must be less than 100 characters');
    }
  }

  private validatePath(filePath: string, baseDir: string): string {
    // Normalize and resolve the path
    const normalized = normalize(filePath);
    const resolved = resolve(baseDir, normalized);

    // Ensure the resolved path is within the base directory
    if (!resolved.startsWith(baseDir)) {
      throw new SecurityError('Path traversal attempt detected', {
        attempted: filePath,
        baseDir,
      });
    }

    return resolved;
  }

  private validateFileSize(filePath: string): void {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      if (stats.size > this.maxFileSize) {
        throw new ValidationError('File size exceeds maximum allowed size', {
          size: stats.size,
          maxSize: this.maxFileSize,
        });
      }
    }
  }

  // Safe file operations
  private readJsonFile<T>(filePath: string): T | null {
    try {
      this.validateFileSize(filePath);
      const content = readFileSync(filePath, 'utf8');

      // Parse with reviver to prevent prototype pollution
      const data = JSON.parse(content, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined; // Filter out dangerous keys
        }
        return value;
      });

      return data as T;
    } catch (error) {
      if (error instanceof ContextError) {
        throw error;
      }
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw new ContextError('Failed to read file', 'READ_ERROR', {
        filePath,
        error: (error as Error).message,
      });
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
      }

      // Create empty file if it doesn't exist (needed for lockfile)
      if (!existsSync(filePath)) {
        writeFileSync(filePath, '{}', { mode: 0o600 });
      }

      // Acquire lock
      const release = await lockfile.lock(filePath, { retries: 3 });

      try {
        // Validate data is JSON serializable and filter dangerous keys
        const jsonString = JSON.stringify(
          data,
          (key, value) => {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
              return undefined;
            }
            return value;
          },
          2,
        );

        // Write atomically by writing to temp file first
        const tempFile = `${filePath}.tmp`;
        writeFileSync(tempFile, jsonString, { mode: 0o600 });

        // Rename is atomic on most filesystems
        renameSync(tempFile, filePath);
      } finally {
        // Always release the lock
        await release();
      }
    } catch (error) {
      throw new ContextError('Failed to write file', 'WRITE_ERROR', {
        filePath,
        error: (error as Error).message,
      });
    }
  }

  // Context API implementation
  async getContext(agentName: string): Promise<AgentContext | null> {
    this.validateAgentName(agentName);

    const contextPath = this.validatePath(`${agentName}.json`, this.contextDir);

    const data = this.readJsonFile<any>(contextPath);
    if (!data) {
      return null;
    }

    // Validate context structure
    if (!data.version || !data.timestamp || !data.agentName || !data.data) {
      throw new ValidationError('Invalid context structure', { agentName });
    }

    return data as AgentContext;
  }

  async saveContext(
    agentName: string,
    data: Record<string, unknown>,
    merge: boolean = true,
  ): Promise<void> {
    this.validateAgentName(agentName);

    let finalData = data;

    // Merge with existing context if requested
    if (merge) {
      const existing = await this.getContext(agentName);
      if (existing) {
        finalData = { ...existing.data, ...data };
      }
    }

    const context: AgentContext = {
      version: this.contextVersion,
      timestamp: new Date().toISOString(),
      agentName,
      data: finalData,
    };

    const contextPath = this.validatePath(`${agentName}.json`, this.contextDir);

    await this.writeJsonFile(contextPath, context);
  }

  // Shared findings API
  async shareFinding(finding: Omit<SharedFinding, 'id' | 'timestamp'>): Promise<void> {
    // Validate finding
    if (!finding.source || !finding.severity || !finding.type || !finding.summary) {
      throw new ValidationError('Invalid finding structure');
    }

    this.validateAgentName(finding.source);

    const completeFinding: SharedFinding = {
      ...finding,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    // Read existing findings
    const findingsPath = join(this.sharedDir, 'critical-issues.json');
    const existing = this.readJsonFile<SharedFinding[]>(findingsPath) || [];

    // Add new finding
    existing.push(completeFinding);

    // Keep only last 1000 findings to prevent unbounded growth
    const trimmed = existing.slice(-1000);

    await this.writeJsonFile(findingsPath, trimmed);
  }

  async getSharedFindings(filter?: FindingFilter): Promise<SharedFinding[]> {
    const findingsPath = join(this.sharedDir, 'critical-issues.json');
    const findings = this.readJsonFile<SharedFinding[]>(findingsPath) || [];

    if (!filter) {
      return findings;
    }

    return findings.filter((finding) => {
      if (filter.severity && finding.severity !== filter.severity) return false;
      if (filter.type && finding.type !== filter.type) return false;
      if (filter.source && finding.source !== filter.source) return false;
      if (filter.since && finding.timestamp < filter.since) return false;
      return true;
    });
  }

  // Helper to check if re-analysis is needed
  async needsReanalysis(paths: string[], lastHash?: string): Promise<boolean> {
    if (!lastHash) return true;

    // Calculate hash of current file list
    const sortedPaths = [...paths].sort();
    const currentHash = createHash('sha256').update(sortedPaths.join('\n')).digest('hex');

    return currentHash !== lastHash;
  }

  // Generate secure random ID
  private generateId(): string {
    return createHash('sha256')
      .update(Date.now().toString())
      .update(Math.random().toString())
      .digest('hex')
      .substring(0, 16);
  }

  // Session logging for audit trail
  async logSession(agentName: string, sessionData: Record<string, unknown>): Promise<void> {
    this.validateAgentName(agentName);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionPath = this.validatePath(`${agentName}-${timestamp}.json`, this.sessionsDir);

    const session = {
      version: this.contextVersion,
      agentName,
      timestamp: new Date().toISOString(),
      data: sessionData,
    };

    await this.writeJsonFile(sessionPath, session);
  }

  // Get repo state for shared understanding
  async getRepoState(): Promise<Record<string, unknown> | null> {
    const statePath = join(this.contextDir, 'repo-state.json');
    return this.readJsonFile(statePath);
  }

  async saveRepoState(state: Record<string, unknown>): Promise<void> {
    const statePath = join(this.contextDir, 'repo-state.json');
    await this.writeJsonFile(statePath, {
      version: this.contextVersion,
      timestamp: new Date().toISOString(),
      data: state,
    });
  }
}

// Export convenience functions for MCP tools
export function createSecureContextManager(projectPath: string): SecureContextManager {
  return new SecureContextManager(projectPath);
}
