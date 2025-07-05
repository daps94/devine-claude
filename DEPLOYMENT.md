# Divine Claude - Deployment Guide

This guide covers installation, updates, and uninstallation of Divine Claude on your system.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Claude CLI (`npm install -g @anthropic-ai/claude-code`)
- Git (for development/updates)

## Installation Methods

### Method 1: Global Installation from npm (Recommended)

```bash
# Install globally
npm install -g claude-swarm

# Verify installation
claude-swarm --version
```

### Method 2: Global Installation from Source

```bash
# Clone the repository
git clone https://github.com/daps94/devine-claude.git
cd devine-claude

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link

# Verify installation
devine-claude --version
```

### Method 3: Local Project Installation

```bash
# In your project directory
npm install devine-claude

# Use with npx
npx devine-claude --version
```

## Development Setup

For contributing or modifying Divine Claude:

```bash
# Clone and setup
git clone https://github.com/daps94/devine-claude.git
cd devine-claude
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Directory Structure

Divine Claude creates the following directories:

```
~/.devine-claude/
├── sessions/          # Session data and logs
│   └── current/       # Symlink to active session
├── context/           # Persistent context storage
│   ├── global.json    # Global context
│   └── swarms/        # Swarm-specific contexts
└── worktrees/         # Git worktree storage
```

## Updating Divine Claude

### Update from npm

```bash
# Check current version
devine-claude --version

# Update to latest
npm update -g devine-claude

# Or reinstall
npm install -g devine-claude@latest
```

### Update from Source

```bash
# Navigate to claude-swarm directory
cd /path/to/devine-claude

# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install

# Rebuild
npm run build

# If globally linked, it's automatically updated
# Otherwise, re-link
npm link
```

## Uninstallation

### Complete Uninstallation

```bash
# 1. Uninstall global package
npm uninstall -g devine-claude

# 2. Remove configuration and data (optional)
rm -rf ~/.devine-claude

# 3. Remove any local installations
# In project directories:
npm uninstall devine-claude
```

### Partial Uninstallation (Keep Data)

```bash
# Just remove the package, keep sessions and context
npm uninstall -g devine-claude
```

## Configuration Files

### Global Configuration

Create `~/.devine-claude/config.json` for global settings:

```json
{
  "defaultModel": "sonnet",
  "defaultProvider": "claude",
  "logLevel": "info",
  "contextRetention": "persistent"
}
```

### Environment Variables

```bash
# Set Claude API key (if not using Claude Code)
export ANTHROPIC_API_KEY="your-api-key"

# Set OpenAI API key for OpenAI provider
export OPENAI_API_KEY="your-api-key"

# Custom home directory
export DEVINE_CLAUDE_HOME="/custom/path"
```

## Troubleshooting

### Command Not Found

```bash
# Check if installed
npm list -g devine-claude

# Check npm bin directory is in PATH
echo $PATH
npm bin -g

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm bin -g):$PATH"
```

### Permission Errors

```bash
# Fix npm permissions (macOS/Linux)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Clean Installation

```bash
# Remove all Divine Claude data and reinstall
rm -rf ~/.devine-claude
npm uninstall -g devine-claude
npm cache clean --force
npm install -g devine-claude
```

## Post-Installation Setup

### 1. Initialize Your First Swarm

```bash
# Create a new swarm configuration
devine-claude init

# Or use the interactive generator
devine-claude generate
```

### 2. Set Global Context (Optional)

```bash
# Set organization context
claude-swarm context set organization "Your Company" --level global

# Set default coding standards
claude-swarm context set coding_standards '{"style": "standard", "language": "TypeScript"}' --level global
```

### 3. Test Installation

```bash
# Run the hello world example
claude-swarm start --config examples/hello-world.yml
```

## Integration with Existing Projects

### Add to package.json Scripts

```json
{
  "scripts": {
    "swarm": "claude-swarm",
    "swarm:start": "claude-swarm start",
    "swarm:clean": "claude-swarm clean"
  }
}
```

### Create Project-Specific Configuration

```yaml
# claude-swarm.yml in project root
version: 1
swarm:
  name: "My Project Swarm"
  main: lead_developer
  instances:
    lead_developer:
      description: "Main development coordinator"
      model: sonnet
      vibe: true
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Context Data**: Be cautious about storing sensitive data in context
3. **Worktrees**: Clean up worktrees regularly with `claude-swarm clean`
4. **Permissions**: Use `vibe: true` carefully - it enables all tools

## Support and Updates

- **Documentation**: Check the README.md and examples/
- **Issues**: Report bugs at https://github.com/daps94/devine-claude/issues
- **Updates**: Watch the repository for new releases
- **Community**: Join discussions in the GitHub Discussions tab

## Version Management

### Check for Updates

```bash
# Check current version
claude-swarm --version

# Check latest version on npm
npm view claude-swarm version

# Check outdated global packages
npm outdated -g
```

### Downgrade if Needed

```bash
# Install specific version
npm install -g claude-swarm@1.0.0

# List available versions
npm view claude-swarm versions
```