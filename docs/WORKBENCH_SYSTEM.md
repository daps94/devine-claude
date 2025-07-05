# Devine Workbench System

## Overview

The Workbench system provides a simple, file-based approach for agents to document their work and share knowledge. It complements the MCP memory system by providing persistent, human-readable documentation.

## Key Principles

1. **Simple**: Just folders and markdown files
2. **Gitignored**: Keeps working files out of version control
3. **Structured**: Clear conventions for organization
4. **Human-Friendly**: All outputs are readable by humans
5. **Agent-Friendly**: Clear instructions in system prompts

## Directory Structure

```
.workbench/
├── active/                     # Current projects
│   └── {YYYYMMDD_HHMMSS}-{name}/
│       ├── README.md          # Project overview
│       ├── assignments.md     # Task assignments
│       ├── context.md         # Shared context
│       ├── findings/          # Agent outputs
│       └── status.json        # Progress tracking
├── completed/                 # Archived projects
└── templates/                 # Reusable templates
```

## How It Works

### 1. Automatic Setup

When you start Devine, it automatically:
- Creates the `.workbench/` directory
- Adds it to `.gitignore`
- Creates a project folder named with timestamp
- Initializes project files

### 2. Orchestrator Responsibilities

The main instance (orchestrator) receives instructions to:
- Update `README.md` with project objectives
- Write clear assignments in `assignments.md`
- Track progress in `status.json`
- Review agent outputs in `findings/`

Example assignment:
```markdown
@code_analyzer: Analyze authentication system in /src/auth
Output to: findings/code_analyzer-auth-security-review.md
Focus on: Security vulnerabilities and best practices
```

### 3. Agent Workflow

Agents receive instructions to:
1. Check `assignments.md` for their tasks
2. Read `context.md` for shared information
3. Perform their analysis/work
4. Save outputs to `findings/` with specific filenames
5. Update `context.md` if they find critical information

### 4. File Naming Convention

```
{agent-name}-{topic}-{identifier}.md
```

The orchestrator should provide specific filenames, not templates. Examples:
- `security-scanner-api-vulns-initial.md`
- `code-analyzer-memory-leaks-v2.md`
- `test-engineer-coverage-report-final.md`

**Important**: Don't use timestamp placeholders like `{timestamp}` or `{YYYYMMDD}` in assignments, as agents won't know how to replace them. Always provide complete, specific filenames.

## Integration with MCP Memory

The workbench complements MCP memory tools:

| Feature | MCP Memory | Workbench |
|---------|------------|-----------|
| **Purpose** | Real-time coordination | Detailed documentation |
| **Format** | JSON | Markdown |
| **Persistence** | Between sessions | Project archives |
| **Access** | Via MCP tools | File system |
| **Best for** | Small context, state | Large reports, findings |

## Usage Examples

### Starting a Security Audit

```yaml
# Configuration
instances:
  security_lead:
    prompt: |
      You coordinate security audits using the workbench.
      Create assignments for: scanner, analyzer, reporter
      Track findings and create final report.
```

The orchestrator will:
1. Create assignments for each specialist
2. Monitor their outputs in `findings/`
3. Update project status
4. Coordinate follow-up tasks

### Multi-Agent Collaboration

```markdown
# In assignments.md
@scanner: Find all API endpoints in /src/api
Output to: findings/scanner-api-endpoints-list.md

@analyzer: After scanner completes, analyze endpoints for security
Input: findings/scanner-api-endpoints-list.md
Output to: findings/analyzer-api-security-review.md
```

## Best Practices

1. **Keep It Simple**: Don't over-engineer the structure
2. **Reference, Don't Duplicate**: Link to other findings instead of copying
3. **Clear Assignments**: Always specify what to analyze and where to save
4. **Regular Updates**: Keep `status.json` current
5. **Archive Completed**: Move finished projects to `completed/`

## Customization

You can customize the workbench by:

1. **Adding Templates**: Create custom templates in `.workbench/templates/`
2. **Modifying Prompts**: Adjust agent instructions for your workflow
3. **Extending Structure**: Add subdirectories as needed

## Troubleshooting

**Workbench not created?**
- Check if Devine has write permissions
- Manually create `.workbench/` if needed

**Agents not using workbench?**
- Verify system prompts include workbench instructions
- Check if agents have file write permissions

**Files not organized?**
- Review orchestrator's assignments
- Ensure clear output paths are specified

## Example Output

After a session, your workbench might contain:

```
.workbench/active/20250105_143022-security-audit/
├── README.md                    # "Security audit for API endpoints"
├── assignments.md               # Tasks for each agent
├── context.md                   # "Found 3 critical vulnerabilities"
├── findings/
│   ├── scanner-api-endpoints-20250105-143122.md
│   ├── analyzer-sql-injection-20250105-143522.md
│   ├── analyzer-auth-bypass-20250105-144021.md
│   └── reporter-executive-summary-20250105-145502.md
└── status.json                  # "status": "complete", "findings": 3
```

The workbench provides a complete audit trail of the team's work, making it easy to review, share, and reference in the future.