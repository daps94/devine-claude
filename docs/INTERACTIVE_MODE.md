# Interactive Mode

## Overview

Claude Swarm supports two execution modes:

1. **Headless Mode** (default with `-p`): All instances run non-interactively, completing tasks and returning results
2. **Interactive Mode** (`-i` flag): Main instance runs as normal Claude Code session with MCP tools

## Usage

### Interactive Mode (Like Ruby claude-swarm)

Run the main instance interactively, just like a normal Claude Code session:

```bash
# Start interactive session
claude-swarm -i

# Interactive with initial task
claude-swarm -i -p "Help me refactor the authentication system"
```

In interactive mode:
- The main instance runs in the foreground
- You can type and interact normally
- Other agents are available as MCP tools (e.g., `mcp__backend_dev__task`)
- The session continues until you exit

### Headless Mode (Default)

When you provide a prompt without `-i`, all instances run headlessly:

```bash
# Headless execution
claude-swarm -p "Build a REST API"
```

In headless mode:
- Main instance executes the prompt and exits
- No interactive input possible
- Good for automation and CI/CD

## Example Configurations

### Interactive Development Team

```yaml
version: 1
swarm:
  name: "Interactive Dev Team"
  main: lead_dev
  instances:
    lead_dev:
      description: "Lead developer coordinating the team"
      model: sonnet
      vibe: true  # Full tool access
      connections: [backend, frontend, tester]
      
    backend:
      description: "Backend API developer"
      model: sonnet
      allowed_tools: [Read, Write, Edit, Bash]
      
    frontend:
      description: "Frontend developer"
      model: sonnet
      allowed_tools: [Read, Write, Edit, Bash]
      
    tester:
      description: "QA engineer"
      model: haiku
      allowed_tools: [Read, Bash]
```

### Interactive Session Example

```bash
$ claude-swarm -i --config team.yml

# You're now in an interactive Claude session
# You can call other agents like:

> Can you help me design a new feature?
> Use mcp__backend__task to design the API endpoints
> Use mcp__frontend__task to create the UI mockup
> Use mcp__tester__task to write test cases
```

## Key Differences

| Feature | Interactive Mode (`-i`) | Headless Mode (default) |
|---------|------------------------|------------------------|
| Main instance | Runs interactively | Executes and exits |
| User input | Can type commands | No input after start |
| Session length | Until user exits | Until task completes |
| Use case | Development, exploration | Automation, CI/CD |
| Prompt handling | Shows as initial context | Executed immediately |

## MCP Tools in Interactive Mode

When running interactively, each connected instance appears as MCP tools:

- `mcp__{instance_name}__task` - Send a task to the instance
- `mcp__{instance_name}__session_info` - Get session information
- `mcp__{instance_name}__reset_session` - Reset the instance's session

Example:
```
Available tools:
- mcp__backend__task
- mcp__frontend__task
- mcp__backend__session_info
- mcp__frontend__session_info
```

## Best Practices

1. **Use interactive mode for**:
   - Exploratory development
   - Complex multi-step tasks
   - When you need to guide the process
   - Debugging and testing

2. **Use headless mode for**:
   - Automated workflows
   - CI/CD pipelines
   - Single well-defined tasks
   - Batch processing

3. **Combining modes**:
   ```bash
   # Start interactive but with initial context
   claude-swarm -i -p "We need to fix the performance issues in the dashboard"
   ```

## Session Management

Interactive sessions can be resumed:

```bash
# Start a new interactive session
claude-swarm -i

# Later, resume the session
claude-swarm --session-id 20241206_143022 -i
```

This maintains:
- Claude's conversation history
- MCP connections to other agents
- Working directory state
- Context from previous work