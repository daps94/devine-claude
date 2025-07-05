import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import winston from 'winston';
import type { SessionLogEntry } from '../types';

export class Logger {
  private logger: winston.Logger;
  private jsonStream?: WriteStream;
  private humanStream?: WriteStream;
  private sessionPath?: string;

  constructor(sessionPath?: string) {
    this.sessionPath = sessionPath;

    // Create Winston logger for console output
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
      ],
    });

    // Set up file streams if session path is provided
    if (sessionPath) {
      this.setupFileLogging(sessionPath);
    }
  }

  private setupFileLogging(sessionPath: string): void {
    // JSON log stream
    const jsonLogPath = join(sessionPath, 'session.log.json');
    this.jsonStream = createWriteStream(jsonLogPath, { flags: 'a' });

    // Human-readable log stream
    const humanLogPath = join(sessionPath, 'session.log');
    this.humanStream = createWriteStream(humanLogPath, { flags: 'a' });
  }

  private writeToFiles(entry: SessionLogEntry): void {
    if (this.jsonStream) {
      this.jsonStream.write(JSON.stringify(entry) + '\n');
    }

    if (this.humanStream) {
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${entry.instance}] ${entry.type.toUpperCase()}: `;

      if (entry.type === 'request' || entry.type === 'response') {
        const formatted = JSON.stringify(entry.data, null, 2)
          .split('\n')
          .map((line, index) => (index === 0 ? prefix + line : '  ' + line))
          .join('\n');
        this.humanStream.write(formatted + '\n\n');
      } else {
        this.humanStream.write(prefix + JSON.stringify(entry.data) + '\n');
      }
    }
  }

  logRequest(instance: string, data: any): void {
    const entry: SessionLogEntry = {
      timestamp: new Date().toISOString(),
      instance,
      type: 'request',
      data,
    };
    this.writeToFiles(entry);
    this.logger.debug(`Request from ${instance}`, data);
  }

  logResponse(instance: string, data: any): void {
    const entry: SessionLogEntry = {
      timestamp: new Date().toISOString(),
      instance,
      type: 'response',
      data,
    };
    this.writeToFiles(entry);
    this.logger.debug(`Response from ${instance}`, data);
  }

  logError(instance: string, error: any): void {
    const entry: SessionLogEntry = {
      timestamp: new Date().toISOString(),
      instance,
      type: 'error',
      data: {
        message: error.message || error,
        stack: error.stack,
      },
    };
    this.writeToFiles(entry);
    this.logger.error(`Error in ${instance}:`, error);
  }

  logInfo(instance: string, message: string, data?: any): void {
    const entry: SessionLogEntry = {
      timestamp: new Date().toISOString(),
      instance,
      type: 'info',
      data: { message, ...data },
    };
    this.writeToFiles(entry);
    this.logger.info(`[${instance}] ${message}`, data);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  close(): void {
    if (this.jsonStream) {
      this.jsonStream.end();
    }
    if (this.humanStream) {
      this.humanStream.end();
    }
  }
}
