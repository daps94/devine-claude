# Devine Claude Examples

This directory contains comprehensive examples showcasing different team configurations and use cases for Devine Claude. Each example demonstrates various features, team structures, and specialization patterns.

## Quick Start

Choose an example that matches your use case:

```bash
# Use an example directly
devine-claude --config examples/simple-team.yml

# Copy and customize an example
cp examples/full-stack-webapp.yml my-team.yml
devine-claude --config my-team.yml
```

## Available Examples

### 🚀 **Getting Started**

#### [`simple-team.yml`](./simple-team.yml)
- **Use Case**: Basic two-person development team
- **Team Size**: 2 agents (lead + developer)
- **Best For**: Learning Devine Claude basics, small projects
- **Features**: Simple coordination, basic tool usage

#### [`blockchain-team.yml`](./blockchain-team.yml)
- **Use Case**: Web3 and smart contract development
- **Team Size**: 4 agents (architect + 3 specialists)
- **Best For**: DeFi projects, smart contract development
- **Features**: Security auditing, context sharing, specialized tools

### 🏗️ **Application Development**

#### [`full-stack-webapp.yml`](./full-stack-webapp.yml)
- **Use Case**: Complete web application development
- **Team Size**: 5 agents (tech lead + 4 specialists)
- **Best For**: Modern web apps, SaaS products
- **Features**: Before commands, directory separation, comprehensive stack coverage
- **Stack**: React, Node.js, PostgreSQL, Docker

#### [`api-development-team.yml`](./api-development-team.yml)
- **Use Case**: API-first development and integration
- **Team Size**: 4 agents (architect + 3 specialists)
- **Best For**: API platforms, integration projects, microservices APIs
- **Features**: API testing, third-party integrations, contract testing
- **Stack**: REST/GraphQL, API gateways, testing frameworks

### 📚 **Research & Documentation**

#### [`context7-research-team.yml`](./context7-research-team.yml)
- **Use Case**: Research team with access to up-to-date documentation
- **Team Size**: 4 agents (research lead + 3 specialists)
- **Best For**: Technical research, documentation projects, staying current
- **Features**: Context7 integration, documentation access, research validation
- **Stack**: Context7 MCP, HTTP MCP servers, documentation tools

## Key Features Demonstrated

### 🔗 **Team Coordination**
- **Connections**: Agent-to-agent communication patterns
- **Main Agent**: Designated team leader for coordination
- **Vibe Mode**: Full tool access for lead agents

### 🛠️ **Tool Management**
- **Tool Restrictions**: Specific tools per role (`allowed_tools`)
- **Context Tools**: Persistent memory between sessions
- **Security Tools**: Finding sharing and vulnerability reporting
- **Web Tools**: API access and web scraping capabilities
- **Context7 Tools**: Access to up-to-date documentation

### 📁 **Project Organization**
- **Directory Separation**: Role-specific working directories
- **Worktree Support**: Git branch isolation for parallel development
- **Before Commands**: Setup automation before agent startup

### 🌐 **MCP Integration**
- **HTTP MCP Servers**: Context7 and other web-based MCP services
- **stdio MCP Servers**: Local command-line MCP tools
- **SSE MCP Servers**: Server-sent events for real-time updates

### 🎯 **Specialization Patterns**
- **Lead + Specialists**: Common hierarchy pattern
- **Peer Networks**: Collaborative specialist teams
- **Review Chains**: Quality assurance workflows
- **Research Teams**: Exploration and experimentation focus

## Customization Guide

### Basic Customization

1. **Change Team Size**: Add/remove agents from `instances`
2. **Modify Roles**: Update agent descriptions and prompts
3. **Adjust Tools**: Change `allowed_tools` based on needs
4. **Update Models**: Choose between `opus`, `sonnet`, `haiku`

### Advanced Features

```yaml
# Setup commands before agents start
before:
  - "npm install"
  - "docker-compose up -d"

# Agent specialization
instances:
  specialist:
    description: "Role description"
    directory: ./specific-area  # Separate working directory
    model: sonnet              # Model selection
    connections: [other_agent] # Who they can communicate with
    worktree: true            # Git branch isolation
    vibe: true                # Full tool access
    
    # Custom prompt for role
    prompt: |
      You are a specialist in...
      Focus on...
      
    # Tool restrictions (ignored if vibe: true)
    allowed_tools:
      - Read
      - Write
      - Edit
      - Bash
      - get_agent_context
      - save_agent_context
      
    # External MCP servers
    mcps:
      - name: context7
        type: http
        url: https://mcp.context7.com/mcp
```

### Model Selection

- **`opus`**: Most capable, best for leads and complex tasks
- **`sonnet`**: Balanced performance, good for most specialists
- **`haiku`**: Fast and efficient, good for simple tasks

### Context Management

```yaml
# Agents can save and retrieve context between sessions
allowed_tools:
  - get_agent_context    # Retrieve saved context
  - save_agent_context   # Save context for next session
  - share_finding        # Share insights with team
  - get_shared_findings  # Access team insights
```

### Context7 Integration

```yaml
# Add Context7 for up-to-date documentation access
mcps:
  - name: context7
    type: http
    url: https://mcp.context7.com/mcp

# Enable Context7 tools
allowed_tools:
  - context7__search_docs
  - context7__get_documentation
  - context7__get_examples
```

## Best Practices

1. **Start Simple**: Begin with `simple-team.yml` and gradually add complexity
2. **Define Clear Roles**: Give each agent a specific, focused responsibility
3. **Use Connections Wisely**: Connect agents who need to collaborate directly
4. **Leverage Context**: Use context tools for persistent memory across sessions
5. **Organize Directories**: Use separate directories for different concerns
6. **Choose Appropriate Models**: Balance capability with cost using model selection
7. **Use Context7**: Access current documentation instead of relying on outdated training data
8. **Consider Vibe Mode**: Use `vibe: true` for rapid prototyping and experimentation

## Support

- **Documentation**: See main README.md for setup and usage
- **Issues**: Report problems at https://github.com/daps94/devine-claude/issues
- **Examples**: Request new examples by opening an issue

## Contributing

Have a great team configuration? Consider contributing it as an example:

1. Fork the repository
2. Add your example to `examples/`
3. Update this README.md
4. Submit a pull request

Examples should be well-documented, demonstrate specific use cases, and follow the established patterns. 