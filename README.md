# Devine

**Devine orchestration for Claude Code** - A Node.js orchestration tool that transforms Claude Code into a powerful multi-agent development team.

Based on the excellent [Claude Swarm](https://github.com/parruda/claude-swarm) Ruby gem, Devine brings sophisticated AI orchestration to the Node.js ecosystem.

## Features

- 🤖 **Multi-Agent Orchestration** - Run multiple Claude or OpenAI instances with specialized roles
- 🔗 **MCP Communication** - Agents communicate via Model Context Protocol
- 🎯 **Interactive Mode** - Run main instance as normal Claude Code with MCP tools
- 🌳 **Git Worktree Support** - Isolated development environments for each agent
- 💾 **Persistent Context** - Agents remember work between sessions
- 💰 **Cost Tracking** - Monitor API usage and costs across your swarm
- 🔄 **Session Management** - Save and restore swarm sessions
- 🛠️ **Tool Permissions** - Fine-grained control over what each agent can do
- 📊 **Real-time Monitoring** - Track running sessions and agent activities

## Installation

```bash
npm install -g devine-claude
```

Prerequisites:
- Node.js 18+ 
- Claude CLI (`npm install -g @anthropic-ai/claude-code`)

## Quick Start

1. Initialize a configuration:
```bash
devine-claude init
```

2. Edit `devine.yml` to define your team:
```yaml
version: 1
swarm:
  name: "My Dev Team"
  main: lead
  instances:
    lead:
      description: "Team lead coordinating development"
      directory: .
      model: opus
      connections: [frontend, backend]
    frontend:
      description: "Frontend developer"
      directory: ./frontend
      model: sonnet
    backend:
      description: "Backend developer"
      directory: ./backend
      model: sonnet
```

3. Start your swarm:
```bash
# Interactive mode (like normal Claude Code)
devine-claude -i

# Headless mode (executes and returns)
devine-claude -p "Build a REST API with authentication"
```

## Configuration

See [examples](./examples) for various configuration patterns:
- Multi-level hierarchies
- Mixed AI providers (Claude + OpenAI)
- Git worktree isolation
- Custom tool permissions

## Commands

- `devine-claude` - Start a swarm (default command)
- `devine-claude init` - Create a configuration template
- `devine-claude ps` - List running sessions
- `devine-claude show <id>` - Show session details
- `devine-claude list-sessions` - List all sessions
- `devine-claude clean` - Clean up old sessions

## Development

```bash
# Clone repository
git clone https://github.com/daps94/devine-claude.git
cd devine-claude

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Claude Swarm](https://github.com/parruda/claude-swarm) - The original Ruby implementation
- [Anthropic](https://www.anthropic.com/) - For Claude and the Model Context Protocol
- The open source community for feedback and contributions

---

*Created by Devin - Because great developers deserve devine orchestration*