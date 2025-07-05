export interface ExecutorOptions {
  prompt: string;
  systemPrompt?: string;
}

export interface ExecutorStats {
  totalCalls: number;
  totalCost: number;
  totalTokens?: number;
}

export abstract class BaseExecutor {
  protected sessionId?: string;
  protected stats: ExecutorStats = {
    totalCalls: 0,
    totalCost: 0,
    totalTokens: 0,
  };

  abstract execute(options: ExecutorOptions): Promise<string>;
  abstract resetSession(): Promise<void>;
  abstract getSessionId(): string | undefined;
  abstract getStats(): ExecutorStats;
}
