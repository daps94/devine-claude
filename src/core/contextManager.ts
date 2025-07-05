import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface ContextData {
  [key: string]: any;
}

export class ContextManager {
  private globalPath: string;
  private swarmPath: string;
  private swarmName: string;
  private contextRoot: string;

  constructor(swarmName: string) {
    this.swarmName = swarmName;
    this.contextRoot = join(homedir(), '.devine', 'context');
    this.globalPath = join(this.contextRoot, 'global.json');
    this.swarmPath = join(this.contextRoot, 'swarms', swarmName);
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    // Create context directories if they don't exist
    mkdirSync(this.contextRoot, { recursive: true });
    mkdirSync(join(this.contextRoot, 'swarms'), { recursive: true });
    mkdirSync(this.swarmPath, { recursive: true });
    mkdirSync(join(this.swarmPath, 'instances'), { recursive: true });
  }

  private readJsonFile(path: string): ContextData {
    if (!existsSync(path)) {
      return {};
    }
    try {
      const content = readFileSync(path, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private writeJsonFile(path: string, data: ContextData): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  }

  // Global context methods
  getGlobalContext(): ContextData {
    return this.readJsonFile(this.globalPath);
  }

  getGlobalContextKey(key: string): any {
    const context = this.getGlobalContext();
    return context[key];
  }

  setGlobalContext(key: string, value: any): void {
    const context = this.getGlobalContext();
    context[key] = value;
    this.writeJsonFile(this.globalPath, context);
  }

  deleteGlobalContext(key: string): boolean {
    const context = this.getGlobalContext();
    if (key in context) {
      delete context[key];
      this.writeJsonFile(this.globalPath, context);
      return true;
    }
    return false;
  }

  // Swarm context methods
  getSwarmContext(): ContextData {
    const swarmFile = join(this.swarmPath, 'swarm.json');
    return this.readJsonFile(swarmFile);
  }

  getSwarmContextKey(key: string): any {
    const context = this.getSwarmContext();
    return context[key];
  }

  setSwarmContext(key: string, value: any): void {
    const swarmFile = join(this.swarmPath, 'swarm.json');
    const context = this.getSwarmContext();
    context[key] = value;
    this.writeJsonFile(swarmFile, context);
  }

  deleteSwarmContext(key: string): boolean {
    const swarmFile = join(this.swarmPath, 'swarm.json');
    const context = this.getSwarmContext();
    if (key in context) {
      delete context[key];
      this.writeJsonFile(swarmFile, context);
      return true;
    }
    return false;
  }

  // Instance context methods
  getInstanceContext(instanceName: string): ContextData {
    const instanceFile = join(this.swarmPath, 'instances', `${instanceName}.json`);
    return this.readJsonFile(instanceFile);
  }

  getInstanceContextKey(instanceName: string, key: string): any {
    const context = this.getInstanceContext(instanceName);
    return context[key];
  }

  setInstanceContext(instanceName: string, key: string, value: any): void {
    const instanceFile = join(this.swarmPath, 'instances', `${instanceName}.json`);
    const context = this.getInstanceContext(instanceName);
    context[key] = value;
    this.writeJsonFile(instanceFile, context);
  }

  deleteInstanceContext(instanceName: string, key: string): boolean {
    const instanceFile = join(this.swarmPath, 'instances', `${instanceName}.json`);
    const context = this.getInstanceContext(instanceName);
    if (key in context) {
      delete context[key];
      this.writeJsonFile(instanceFile, context);
      return true;
    }
    return false;
  }

  // Update methods for bulk operations
  updateGlobalContext(updates: ContextData, operation: 'merge' | 'replace' = 'merge'): void {
    if (operation === 'replace') {
      this.writeJsonFile(this.globalPath, updates);
    } else {
      const context = this.getGlobalContext();
      const merged = this.deepMerge(context, updates);
      this.writeJsonFile(this.globalPath, merged);
    }
  }

  updateSwarmContext(updates: ContextData, operation: 'merge' | 'replace' = 'merge'): void {
    const swarmFile = join(this.swarmPath, 'swarm.json');
    if (operation === 'replace') {
      this.writeJsonFile(swarmFile, updates);
    } else {
      const context = this.getSwarmContext();
      const merged = this.deepMerge(context, updates);
      this.writeJsonFile(swarmFile, merged);
    }
  }

  updateInstanceContext(
    instanceName: string,
    updates: ContextData,
    operation: 'merge' | 'replace' = 'merge',
  ): void {
    const instanceFile = join(this.swarmPath, 'instances', `${instanceName}.json`);
    if (operation === 'replace') {
      this.writeJsonFile(instanceFile, updates);
    } else {
      const context = this.getInstanceContext(instanceName);
      const merged = this.deepMerge(context, updates);
      this.writeJsonFile(instanceFile, merged);
    }
  }

  // Build combined context for an instance (includes global + swarm + instance)
  buildInstanceContext(instanceName: string): ContextData {
    const global = this.getGlobalContext();
    const swarm = this.getSwarmContext();
    const instance = this.getInstanceContext(instanceName);

    // Deep merge contexts with priority: instance > swarm > global
    const combined = this.deepMerge(this.deepMerge(global, swarm), instance);

    // Add metadata about context sources
    combined._contextMeta = {
      sources: ['global', 'swarm', 'instance'],
      instanceName,
      swarmName: this.swarmName,
      timestamp: new Date().toISOString(),
    };

    return combined;
  }

  // Clear context at different levels
  clearGlobalContext(): void {
    this.writeJsonFile(this.globalPath, {});
  }

  clearSwarmContext(): void {
    const swarmFile = join(this.swarmPath, 'swarm.json');
    this.writeJsonFile(swarmFile, {});
  }

  clearInstanceContext(instanceName: string): void {
    const instanceFile = join(this.swarmPath, 'instances', `${instanceName}.json`);
    this.writeJsonFile(instanceFile, {});
  }

  // Utility method for deep merging objects
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
