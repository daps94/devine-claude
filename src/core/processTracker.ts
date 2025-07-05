import { ChildProcess } from 'child_process';
import type { ProcessInfo } from '../types';

export class ProcessTracker {
  private processes: Map<number, ProcessInfo> = new Map();
  private cleanupHandlers: Array<() => void> = [];

  track(process: ChildProcess, name: string, command: string): void {
    if (!process.pid) {
      throw new Error(`Failed to get PID for process: ${name}`);
    }

    const info: ProcessInfo = {
      pid: process.pid,
      name,
      command,
      startTime: new Date(),
    };

    this.processes.set(process.pid, info);

    // Remove from tracking when process exits
    process.once('exit', () => {
      if (process.pid) {
        this.processes.delete(process.pid);
      }
    });
  }

  addCleanupHandler(handler: () => void): void {
    this.cleanupHandlers.push(handler);
  }

  async cleanup(): Promise<void> {
    // Run cleanup handlers first
    for (const handler of this.cleanupHandlers) {
      try {
        handler();
      } catch (error) {
        console.error('Cleanup handler error:', error);
      }
    }

    // Kill all tracked processes
    const pids = Array.from(this.processes.keys());

    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch (error: any) {
        // Process might have already exited
        if (error.code !== 'ESRCH') {
          console.error(`Failed to kill process ${pid}:`, error);
        }
      }
    }

    // Give processes time to exit gracefully
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Force kill any remaining processes
    for (const pid of pids) {
      if (this.processes.has(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch (error: any) {
          // Process might have already exited
          if (error.code !== 'ESRCH') {
            console.error(`Failed to force kill process ${pid}:`, error);
          }
        }
      }
    }

    this.processes.clear();
  }

  getProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  getProcess(pid: number): ProcessInfo | undefined {
    return this.processes.get(pid);
  }

  isTracking(pid: number): boolean {
    return this.processes.has(pid);
  }

  getProcessCount(): number {
    return this.processes.size;
  }

  setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, cleaning up...`);
        try {
          await this.cleanup();
          process.exit(0);
        } catch (error) {
          console.error('Cleanup error:', error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      try {
        await this.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      try {
        await this.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      process.exit(1);
    });
  }
}
