// Test setup file
import { config } from 'dotenv';

// Load environment variables
config();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CLAUDE_SWARM_HOME = '/tmp/claude-swarm-test';

// Mock console methods to reduce noise in tests
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
});

// Global test timeout
jest.setTimeout(30000);