# Migrating to Secure Context System

## Overview

We've replaced the original context system with a secure, simpler implementation based on team feedback. The new system addresses critical security vulnerabilities while providing a more practical API.

## Key Changes

### 1. Security Improvements
- **Path traversal protection**: Instance names are validated
- **Input sanitization**: Prevents injection attacks
- **File locking**: Prevents race conditions
- **Prototype pollution protection**: Dangerous keys filtered
- **Size limits**: Prevents DoS attacks

### 2. Simplified Architecture
```
.analysis/
├── context/           # Agent-specific contexts
├── sessions/          # Audit logs
└── shared/           # Shared findings between agents
```

### 3. New MCP Tools

**Old tools** (removed):
- `swarm_context_get`
- `swarm_context_set`
- `swarm_context_update`
- `swarm_context_delete`

**New tools** (added):
- `get_agent_context` - Get your own context
- `save_agent_context` - Save your context
- `share_finding` - Share findings with team
- `get_shared_findings` - See team findings
- `check_reanalysis_needed` - Check if files changed
- `repo_state` - Get/save repository state

## Migration Steps

### 1. Update Configuration

No changes needed to YAML files. Context injection happens automatically.

### 2. Update Agent Prompts

Old approach:
```yaml
prompt: |
  Use swarm_context_get to retrieve context.
  Use swarm_context_set to store data.
```

New approach:
```yaml
prompt: |
  Use get_agent_context to check previous work.
  Use save_agent_context to remember findings.
  Use share_finding for critical issues.
```

### 3. Context Usage Examples

**Saving context:**
```javascript
// Old way
swarm_context_set({ 
  level: 'instance',
  key: 'last_scan',
  value: scanResults 
})

// New way
save_agent_context({
  data: { last_scan: scanResults }
})
```

**Sharing findings:**
```javascript
// New feature - wasn't available before
share_finding({
  severity: 'critical',
  type: 'vulnerability',
  affected: ['auth.js'],
  summary: 'SQL injection in login'
})
```

### 4. Automatic Context Injection

Agents automatically receive their context in system prompts:

```
## Persistent Context

The following context is available from previous sessions:

```json
{
  "last_analysis": "2024-01-01",
  "files_scanned": 150
}
```

Consider this context when performing your tasks.
```

## Benefits

1. **Security**: Prevents path traversal, injection, and DoS attacks
2. **Simplicity**: Fewer concepts, easier to use
3. **Performance**: File locking prevents corruption
4. **Collaboration**: Shared findings improve team coordination

## Breaking Changes

1. Context levels (global/swarm/instance) removed - each agent has its own context
2. No publish/subscribe system - use shared findings instead
3. No context routing rules - agents pull what they need
4. CLI context commands removed - managed through agent tools

## Support

If you need help migrating or have questions about the new system, please open an issue.