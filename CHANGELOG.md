# Changelog

All notable changes to Divine Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-07-05

### Added
- Complete port from Ruby to Node.js/TypeScript
- Full CLI with all commands: start, ps, show, watch, list-sessions, clean, init, generate
- MCP (Model Context Protocol) server implementation
- Support for Claude (via Claude CLI) and OpenAI providers
- Git worktree support for isolated development environments
- Session management and restoration
- Process tracking and cleanup
- Configuration validation with detailed error messages
- Cost tracking for sessions
- TypeScript type definitions for better developer experience
- Comprehensive test suite
- **NEW: Persistent context system** (not in Ruby version)
  - Global, swarm, and instance-level context storage
  - Context management CLI commands
  - Automatic context injection into agent system prompts
  - MCP tools for agents to read/write context

### Changed
- Improved configuration validation with better error messages
- Enhanced orchestrator with context injection
- Better structured codebase with clear separation of concerns
- Modern async/await patterns throughout

### Security
- Proper handling of API keys and sensitive data
- Validation of all user inputs
- Safe file operations with proper error handling

## [0.1.0] - 2024-07-04 (Pre-release)

### Added
- Initial project setup
- Core architecture implementation
- Basic CLI structure

## Ruby Version History

For the history of the original Ruby implementation, see:
https://github.com/parruda/claude-swarm/blob/main/CHANGELOG.md