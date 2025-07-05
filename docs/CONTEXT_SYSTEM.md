# Claude Swarm Persistent Context System

## Overview

The Claude Swarm context system provides persistent, hierarchical context storage that allows agents to retain information between sessions. This addresses the need for agents to "remember" previous work when they restart, similar to "showing up to work on Monday" with knowledge of what was done before.

## Architecture

### Context Levels

1. **Global Context**: Shared across all swarms and instances
   - Stored in: `~/.claude-swarm/context/global.json`
   - Use case: Organization-wide settings, shared resources

2. **Swarm Context**: Specific to a swarm configuration
   - Stored in: `~/.claude-swarm/context/{swarm-name}.json`
   - Use case: Project-specific information, team goals

3. **Instance Context**: Specific to individual agents
   - Stored in: `~/.claude-swarm/context/{swarm-name}/{instance-name}.json`
   - Use case: Agent-specific tasks, specialized knowledge

### Context Inheritance

Contexts are merged hierarchically with the following priority:
- Instance context (highest priority)
- Swarm context
- Global context (lowest priority)

## Implementation Details

### Core Components

1. **ContextManager** (`src/core/contextManager.ts`)
   - Handles storage and retrieval of context data
   - Manages TTL (time-to-live) for context entries
   - Performs deep merging of hierarchical contexts

2. **MCP Tools** (`src/mcp/tools/`)
   - `contextGetTool.ts`: Allows agents to retrieve context
   - `contextSetTool.ts`: Allows agents to store context
   - `contextDeleteTool.ts`: Allows agents to remove context

3. **CLI Commands** (`src/cli/commands/context.ts`)
   - `claude-swarm context get`: View context values
   - `claude-swarm context set`: Store context values
   - `claude-swarm context delete`: Remove context values

4. **Orchestrator Integration** (`src/core/orchestrator.ts`)
   - Automatically injects relevant context into agent system prompts
   - Context appears as a formatted section in the system prompt

## Usage Examples

### CLI Usage

```bash
# Set global context
claude-swarm context set company "ACME Corp" --level global

# Set swarm-level context
claude-swarm context set project_name "E-commerce Platform" --level swarm --config myswarm.yml

# Set instance-level context
claude-swarm context set specialization "Database optimization" --level instance --instance backend --config myswarm.yml

# View context
claude-swarm context get --level instance --instance backend --config myswarm.yml

# Get specific key
claude-swarm context get company --level global

# Delete context
claude-swarm context delete old_data --level swarm --config myswarm.yml
```

### Agent Usage (via MCP tools)

Agents can use the following tools:

```typescript
// Get context
swarm_context_get({ level: 'swarm', key: 'project_status' })

// Set context
swarm_context_set({ 
  level: 'instance',
  instance: 'backend',
  key: 'last_deployment',
  value: { version: '1.2.3', timestamp: '2024-07-05' }
})

// Delete context
swarm_context_delete({ level: 'global', key: 'deprecated_setting' })
```

### System Prompt Injection

When an agent starts, their context is automatically injected:

```
## Persistent Context

The following context is available from previous sessions:

```json
{
  "organization": "ACME Corp",
  "project_name": "E-commerce Platform",
  "specialization": "Database optimization"
}
```

Consider this context when performing your tasks.
```

## Best Practices

1. **Use appropriate context levels**:
   - Global: Company-wide settings, shared resources
   - Swarm: Project configuration, team objectives
   - Instance: Agent-specific tasks, work history

2. **Keep context focused**: Store only relevant information that helps agents perform their tasks

3. **Use TTL for temporary data**: Set expiration times for context that shouldn't persist indefinitely

4. **Structure data properly**: Use nested objects for related information

5. **Document context usage**: Include context requirements in agent prompts

## Implementation Benefits

1. **Continuity**: Agents retain knowledge across sessions
2. **Coordination**: Shared context improves team collaboration
3. **Efficiency**: Reduces need to re-explain project details
4. **Flexibility**: Hierarchical structure supports various use cases
5. **Simplicity**: Easy to use for both humans and agents

## Future Enhancements

Potential improvements to consider:
- Context versioning and history
- Context templates for common scenarios
- Automatic context cleanup policies
- Context sharing between different swarm configurations
- Integration with external knowledge bases