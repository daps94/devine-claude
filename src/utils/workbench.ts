import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export class WorkbenchManager {
  private workbenchRoot: string;
  private projectName: string;
  private projectPath: string;

  constructor(workingDirectory: string, projectName?: string) {
    this.workbenchRoot = join(workingDirectory, '.workbench');
    this.projectName = projectName || this.generateProjectName();
    this.projectPath = join(this.workbenchRoot, 'active', this.projectName);
  }

  private generateProjectName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}_${hours}${minutes}${seconds}-session`;
  }

  async initialize(): Promise<void> {
    // Create directory structure
    const dirs = [
      this.workbenchRoot,
      join(this.workbenchRoot, 'active'),
      join(this.workbenchRoot, 'completed'),
      join(this.workbenchRoot, 'templates'),
      this.projectPath,
      join(this.projectPath, 'findings'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Ensure .gitignore includes .workbench
    await this.ensureGitignore();

    // Create initial project files
    await this.createProjectFiles();
  }

  private async ensureGitignore(): Promise<void> {
    const gitignorePath = join(this.workbenchRoot, '..', '.gitignore');
    let content = '';

    if (existsSync(gitignorePath)) {
      content = readFileSync(gitignorePath, 'utf8');
    }

    if (!content.includes('.workbench')) {
      content += '\n# Devine workbench\n.workbench/\n';
      writeFileSync(gitignorePath, content);
    }
  }

  private async createProjectFiles(): Promise<void> {
    // Create README.md
    const readmePath = join(this.projectPath, 'README.md');
    if (!existsSync(readmePath)) {
      writeFileSync(
        readmePath,
        `# Project: ${this.projectName}

## Overview
Created: ${new Date().toISOString()}

## Objective
[Will be updated by orchestrator]

## Team
- **Orchestrator**: Main coordinator
- **Agents**: [Will be listed as assigned]

## Status
- [ ] Planning
- [ ] In Progress
- [ ] Review
- [ ] Complete
`,
      );
    }

    // Create assignments.md
    const assignmentsPath = join(this.projectPath, 'assignments.md');
    if (!existsSync(assignmentsPath)) {
      writeFileSync(
        assignmentsPath,
        `# Task Assignments

## Active Tasks

[Assignments will be added by orchestrator]

## Completed Tasks

[Completed tasks will be moved here]
`,
      );
    }

    // Create context.md
    const contextPath = join(this.projectPath, 'context.md');
    if (!existsSync(contextPath)) {
      writeFileSync(
        contextPath,
        `# Shared Context

## Project Context
[Key information for all agents]

## Technical Context
[Architecture, constraints, requirements]

## Progress Notes
[Updates as work progresses]
`,
      );
    }

    // Create status.json
    const statusPath = join(this.projectPath, 'status.json');
    if (!existsSync(statusPath)) {
      writeFileSync(
        statusPath,
        JSON.stringify(
          {
            project: this.projectName,
            created: new Date().toISOString(),
            status: 'planning',
            agents: {},
            progress: 0,
          },
          null,
          2,
        ),
      );
    }
  }

  getProjectPath(): string {
    return this.projectPath;
  }

  getWorkbenchInstructions(): string {
    return `
## Workbench System

All work is documented in the .workbench/ folder structure:

**Current Project**: ${this.projectName}
**Project Path**: ${this.projectPath}

### File Structure:
- README.md - Project overview
- assignments.md - Your tasks
- context.md - Shared information
- findings/ - Where you save your work

### Output Format:
When you complete analysis or create output, save it to:
\`findings/{your-agent-name}-{topic}-{unique-id}.md\`

For example:
- findings/analyzer-code-structure-v1.md
- findings/reviewer-security-issues-final.md
- findings/scanner-api-endpoints-complete.md

### Reading Assignments:
Check assignments.md for your specific tasks and output requirements.

### Sharing Information:
- Use context.md for information all agents need
- Reference other agents' findings by filename
- Keep outputs focused and well-structured
`;
  }

  getOrchestratorInstructions(): string {
    return `
## Workbench Management

You are responsible for managing the project workbench:

**Project Path**: ${this.projectPath}

### Your Responsibilities:
1. Update README.md with project objectives
2. Write clear assignments in assignments.md
3. Track progress in status.json
4. Review agent outputs in findings/
5. Update context.md with key information

### Assignment Format:
When assigning tasks, always specify:
- What to analyze/create
- Where to save output (specific filename)
- Any dependencies on other agents' work

Example:
\`\`\`
@code_analyzer: Analyze the authentication system in /src/auth
Output to: findings/code_analyzer-auth-security-analysis.md
Focus on: Security vulnerabilities and best practices
\`\`\`

IMPORTANT: Always give agents a specific, complete filename (not a template).

### Coordination Patterns:
- Reference files instead of copying content
- "See findings/security-scanner-api-vulns-*.md for details"
- Keep assignments atomic and focused
- Update status.json as work progresses
`;
  }
}
