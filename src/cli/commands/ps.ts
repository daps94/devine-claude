import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import Table from 'cli-table3';
import chalk from 'chalk';
import { formatDuration, formatCost, parseSessionId } from '../../utils/system';
import type { SessionMetadata } from '../../types';

interface RunningSession {
  sessionId: string;
  swarmName: string;
  totalCost: number;
  uptime: string;
  directories: string[];
  metadata: SessionMetadata;
}

export async function psCommand(): Promise<void> {
  const sessionRoot = process.env.DEVINE_HOME || join(homedir(), '.devine');
  const sessions = findRunningSessions(sessionRoot);

  if (sessions.length === 0) {
    console.log(chalk.yellow('No running Devine sessions found'));
    return;
  }

  console.log(chalk.yellow('⚠️  Total cost does not include the cost of the main instance\n'));

  // Create table
  const table = new Table({
    head: ['SESSION_ID', 'SWARM_NAME', 'TOTAL_COST', 'UPTIME', 'DIRECTORY'],
    style: {
      head: ['cyan'],
    },
  });

  // Add sessions to table
  sessions.forEach((session) => {
    table.push([
      session.sessionId,
      session.swarmName,
      formatCost(session.totalCost),
      session.uptime,
      session.directories.join(', '),
    ]);
  });

  console.log(table.toString());
}

function findRunningSessions(sessionRoot: string): RunningSession[] {
  const sessions: RunningSession[] = [];
  const sessionsDir = join(sessionRoot, 'sessions');

  if (!existsSync(sessionsDir)) {
    return sessions;
  }

  // Iterate through all project directories
  const projects = readdirSync(sessionsDir).filter((name) => {
    const path = join(sessionsDir, name);
    return statSync(path).isDirectory();
  });

  for (const project of projects) {
    const projectDir = join(sessionsDir, project);
    const sessionDirs = readdirSync(projectDir).filter((name) => {
      const path = join(projectDir, name);
      return statSync(path).isDirectory();
    });

    for (const sessionId of sessionDirs) {
      const sessionPath = join(projectDir, sessionId);
      const metadataPath = join(sessionPath, 'session_metadata.json');

      if (!existsSync(metadataPath)) continue;

      try {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as SessionMetadata;

        // Check if session is still running (simple heuristic: check if main instance has PID file)
        const isRunning = checkIfSessionRunning(sessionPath, metadata);

        if (isRunning) {
          const totalCost = calculateSessionCost(sessionPath);
          const startTime = new Date(metadata.startTime);
          const uptime = formatDuration((Date.now() - startTime.getTime()) / 1000);

          // Get unique directories
          const directories = Array.from(
            new Set(
              Object.values(metadata.instances)
                .map((inst) => inst.directory)
                .filter(Boolean),
            ),
          );

          sessions.push({
            sessionId,
            swarmName: metadata.swarmName,
            totalCost,
            uptime,
            directories,
            metadata,
          });
        }
      } catch (error) {
        // Invalid metadata, skip
      }
    }
  }

  return sessions.sort((a, b) => b.sessionId.localeCompare(a.sessionId));
}

function checkIfSessionRunning(sessionPath: string, metadata: SessionMetadata): boolean {
  // Check if any instance state files have been updated recently (within last 5 minutes)
  const statePath = join(sessionPath, 'state');
  if (!existsSync(statePath)) return false;

  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const stateFiles = readdirSync(statePath);

  for (const file of stateFiles) {
    const filePath = join(statePath, file);
    const stats = statSync(filePath);
    if (stats.mtime.getTime() > fiveMinutesAgo) {
      return true;
    }
  }

  return false;
}

function calculateSessionCost(sessionPath: string): number {
  let totalCost = 0;
  const logPath = join(sessionPath, 'session.log.json');

  if (!existsSync(logPath)) return totalCost;

  try {
    const content = readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'response' && entry.data?.cost) {
          totalCost += entry.data.cost;
        }
      } catch {
        // Invalid JSON line, skip
      }
    }
  } catch {
    // Error reading log file
  }

  return totalCost;
}
