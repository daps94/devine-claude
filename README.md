# Divine Claude

**Divine Claude** orchestrates multiple Claude instances as a collaborative AI development team through the Model Context Protocol (MCP).

## Features

- **Multi-Agent Coordination**: Multiple Claude instances working together on complex tasks
- **MCP Integration**: Seamless communication between agents via Model Context Protocol
- **Context Sharing**: Persistent memory and findings shared across team members
- **Git Worktree Support**: Isolated development environments for each agent
- **Flexible Tool Management**: Fine-grained control over what tools each agent can use
- **Session Management**: Persistent sessions that can be resumed across restarts
- **Provider Support**: Works with both Claude (Anthropic) and OpenAI models
- **Context7 Integration**: Access to up-to-date documentation for any technology
- **YOLO/Vibe Mode**: Skip all permission checks for rapid development

## Quick Start

### Installation

```bash
npm install -g devine-claude
```

### Initialize Configuration

```bash
devine-claude init
```

This creates a `devine.yml` file with a basic team configuration.

### Start Your Team

```bash
# Start with default configuration
devine-claude

# Start with custom configuration
devine-claude --config my-team.yml

# YOLO mode - all tools allowed, no restrictions
devine-claude --vibe

# Non-interactive mode with prompt
devine-claude --prompt "Build a React todo app"

# Resume previous session
devine-claude --session-id 20241225_120000
```

## YOLO/Vibe Mode 🎯

**Vibe mode** (also known as YOLO mode) is Divine Claude's "no limits" operating mode that skips all permission checks and tool restrictions.

### What Vibe Mode Does

- **Unrestricted Tool Access**: All tools are available to all agents
- **No Permission Prompts**: Bypasses Claude's safety confirmations
- **Maximum Autonomy**: Agents can use any capability without asking
- **Rapid Development**: Perfect for prototyping and experimentation

### Enabling Vibe Mode

```bash
# Global vibe mode (all agents)
devine-claude --vibe

# Per-agent vibe mode in configuration
instances:
  lead:
    description: "Team lead with full permissions"
    vibe: true  # This agent runs unrestricted
    
  restricted_worker:
    description: "Worker with limited permissions"
    allowed_tools: [Read, Write]  # This agent has restrictions
```

### When to Use Vibe Mode

✅ **Good for:**
- Rapid prototyping
- Proof of concepts
- Personal projects
- Learning and experimentation
- When you trust the AI completely

⚠️ **Use caution with:**
- Production environments
- Sensitive codebases
- Systems with important data
- Shared development environments

## Context7 Integration 📚

Context7 provides access to up-to-date documentation for any technology, framework, or API directly within your Divine Claude teams.

### Adding Context7 to Your Team

```yaml
instances:
  researcher:
    description: "Technical researcher with documentation access"
    mcps:
      - name: context7
        type: http
        url: https://mcp.context7.com/mcp
    allowed_tools:
      - Read
      - Write
      - context7__search_docs
      - context7__get_documentation
```

### Context7 Tools

- `context7__search_docs`: Search for documentation on any topic
- `context7__get_documentation`: Get detailed documentation for specific technologies
- `context7__get_examples`: Access code examples and snippets
- `context7__check_versions`: Verify current versions and compatibility

### Example: Research Team with Context7

```yaml
version: 1
swarm:
  name: "Documentation Research Team"
  main: lead
  instances:
    lead:
      description: "Research coordinator"
      vibe: true
      connections: [researcher, writer]
      
    researcher:
      description: "Technical researcher with Context7 access"
      mcps:
        - name: context7
          type: http
          url: https://mcp.context7.com/mcp
      allowed_tools:
        - context7__search_docs
        - context7__get_documentation
        - get_agent_context
        - save_agent_context
        
    writer:
      description: "Documentation writer"
      allowed_tools:
        - Read
        - Write
        - Edit
        - get_shared_findings
```

## Configuration Reference

### Basic Structure

```yaml
version: 1
swarm:
  name: "Your Team Name"
  main: lead_agent
  before:  # Optional setup commands
    - "npm install"
    - "docker-compose up -d"
  instances:
    # Agent definitions...
```

### Agent Configuration

```yaml
agent_name:
  description: "Agent role and responsibilities (required)"
  directory: ./workspace          # Working directory
  model: opus                     # opus, sonnet, haiku, gpt-4o
  provider: claude                # claude (default) or openai
  vibe: false                     # Enable unrestricted mode
  connections: [other_agent]      # Which agents this one can communicate with
  worktree: true                  # Use Git worktree isolation
  
  # System prompt
  prompt: |
    You are a specialized agent focused on...
    Your responsibilities include...
    
  # Tool permissions (ignored if vibe: true)
  allowed_tools:
    - Read
    - Write
    - Edit
    - Bash
    - WebFetch
    - WebSearch
    - get_agent_context
    - save_agent_context
    - share_finding
    - get_shared_findings
    
  disallowed_tools:  # Override specific tools
    - "Bash(rm:*)"
    - "Write(*.log)"
    
  # External MCP servers
  mcps:
    - name: context7
      type: http
      url: https://mcp.context7.com/mcp
    - name: database
      type: stdio
      command: /path/to/mcp-server
      args: ["--flag", "value"]
      env:
        API_KEY: "secret"
```

### OpenAI Provider

```yaml
instances:
  gpt_agent:
    description: "OpenAI-powered agent"
    provider: openai
    model: gpt-4o
    temperature: 0.7
    api_version: chat_completion
    openai_token_env: OPENAI_API_KEY
    base_url: "https://api.openai.com/v1"  # Optional custom endpoint
    vibe: true  # OpenAI agents default to vibe mode
```

## Tool System

### Core Tools

- **Read**: Read files and directories
- **Write**: Create new files
- **Edit**: Modify existing files
- **Bash**: Execute shell commands
- **WebFetch**: Fetch web content
- **WebSearch**: Search the web

### Context Tools

- **get_agent_context**: Retrieve saved context from previous sessions
- **save_agent_context**: Save context for future sessions
- **share_finding**: Share discoveries with the team
- **get_shared_findings**: Access team discoveries

### MCP Tools

- **mcp__[agent]__task**: Delegate tasks to connected agents
- **mcp__[agent]__session_info**: Get agent session information
- **mcp__[agent]__reset_session**: Reset agent session
- **context7__[tool]**: Context7 documentation tools

### Tool Patterns

You can use patterns to restrict tools:

```yaml
allowed_tools:
  - "Bash(npm:*)"      # Only npm commands
  - "Write(*.md)"      # Only markdown files
  - "mcp__frontend__*" # All frontend agent tools
```

## Git Worktrees

Divine Claude supports Git worktrees for isolated development environments.

### Benefits

- **Isolation**: Each agent works in separate branches
- **Parallel Development**: Multiple features developed simultaneously
- **Safety**: No conflicts between agent changes
- **Clean History**: Each agent's work is clearly separated

### Configuration

```bash
# Auto-generated worktree names
devine-claude --worktree

# Custom worktree name
devine-claude --worktree feature-branch

# Per-agent worktree configuration
instances:
  frontend:
    description: "Frontend developer"
    worktree: true  # Enable worktree for this agent
```

### Worktree Structure

```
~/.devine-claude/worktrees/
└── [session_id]/
    ├── repo-[hash]/
    │   └── frontend-branch/     # Agent's isolated workspace
    └── other-repo-[hash]/
        └── backend-branch/      # Another agent's workspace
```

## Session Management

### Session Storage

Sessions are stored in `~/.devine-claude/sessions/{project}/{timestamp}/`:

```
20241225_143022/
├── config.yml              # Team configuration used
├── session_metadata.json   # Session information
├── state/                   # Agent states and context
├── logs/                    # Session logs
└── *.mcp.json              # MCP configurations
```

### Commands

```bash
# List recent sessions
devine-claude list-sessions

# List more sessions with details
devine-claude list-sessions --limit 20

# Resume specific session
devine-claude --session-id 20241225_143022
```

## Advanced Features

### Before Commands

Execute setup commands before starting agents:

```yaml
swarm:
  before:
    - "npm install"
    - "docker-compose up -d redis db"
    - "python setup.py install"
```

### Multi-Directory Support

Agents can work across multiple directories:

```yaml
instances:
  fullstack:
    description: "Full-stack developer"
    directory: 
      - ./frontend
      - ./backend
      - ./shared
```

### Custom MCP Servers

Add external MCP servers for specialized functionality:

```yaml
mcps:
  - name: database
    type: stdio
    command: mcp-server-sqlite
    args: ["--db-path", "./data.db"]
    
  - name: api_service
    type: sse
    url: "https://api.example.com/mcp"
    
  - name: context7
    type: http
    url: "https://mcp.context7.com/mcp"
    headers:
      Authorization: "Bearer token"
```

## Examples

The `examples/` directory contains comprehensive team configurations:

- **simple-team.yml**: Basic two-person team
- **full-stack-webapp.yml**: Complete web application team  
- **microservices-team.yml**: Distributed systems architecture
- **ai-research-team.yml**: ML research and development
- **context7-research-team.yml**: Research team with Context7 access
- **blockchain-team.yml**: Web3 and smart contract development
- **game-development-team.yml**: Indie game development
- **devops-infrastructure-team.yml**: Infrastructure and operations
- And more...

### Using Examples

```bash
# Use an example directly
devine-claude --config examples/full-stack-webapp.yml

# Copy and customize
cp examples/context7-research-team.yml my-research-team.yml
devine-claude --config my-research-team.yml
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Use `--vibe` for unrestricted access
2. **Agent Not Responding**: Check MCP server status and logs
3. **Context Not Shared**: Verify agents have context tools enabled
4. **Worktree Conflicts**: Ensure unique branch names

### Debug Mode

```bash
# Enable verbose logging
devine-claude --config team.yml --debug

# Check session logs
tail -f ~/.devine-claude/sessions/*/logs/session.log
```

### Environment Variables

```bash
# Custom home directory
export DEVINE_HOME="/path/to/custom/dir"

# OpenAI API key
export OPENAI_API_KEY="your-key-here"

# Debug mode
export DEBUG=devine-claude:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Divine Claude** - Orchestrating AI teams for complex development tasks.