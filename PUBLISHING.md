# Publishing Divine Claude to npm

This guide covers how to publish Divine Claude to the npm registry.

## Pre-Publishing Checklist

- [ ] All tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Build works (`npm run build`)
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated
- [ ] README.md is accurate
- [ ] Examples work correctly
- [ ] No sensitive data in code

## Publishing Steps

### 1. Prepare the Package

```bash
# Clean install and test
rm -rf node_modules dist
npm install
npm test
npm run build

# Check what will be published
npm pack --dry-run

# Review package contents
tar -tzf claude-swarm-*.tgz
```

### 2. Update Version

```bash
# For patch release (bug fixes)
npm version patch

# For minor release (new features)
npm version minor

# For major release (breaking changes)
npm version major

# This will:
# - Update version in package.json
# - Create a git commit
# - Create a git tag
```

### 3. Login to npm

```bash
# Login to npm (one time)
npm login

# Verify you're logged in
npm whoami
```

### 4. Publish to npm

```bash
# Publish to npm registry
npm publish

# For scoped package (if using @yourorg/claude-swarm)
npm publish --access public
```

### 5. Push to GitHub

```bash
# Push commits and tags
git push origin main
git push origin --tags

# Create GitHub release
# Go to https://github.com/daps94/devine-claude/releases
# Click "Create a new release"
# Select the version tag
# Add release notes from CHANGELOG.md
```

## Package.json Configuration

Ensure these fields are correct before publishing:

```json
{
  "name": "claude-swarm",
  "version": "1.0.0",
  "description": "Orchestrate multiple Claude instances for collaborative AI development",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "claude-swarm": "./bin/claude-swarm.js"
  },
  "files": [
    "dist",
    "bin",
    "examples",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "keywords": [
    "claude",
    "ai",
    "orchestration",
    "mcp",
    "swarm",
    "anthropic",
    "llm"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/daps94/devine-claude.git"
  },
  "bugs": {
    "url": "https://github.com/daps94/devine-claude/issues"
  },
  "homepage": "https://github.com/daps94/devine-claude#readme",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Post-Publishing

### Verify Installation

```bash
# Install globally to test
npm install -g claude-swarm

# Test it works
claude-swarm --version
claude-swarm init
```

### Update Documentation

1. Update installation instructions in README
2. Add announcement to project website/blog
3. Tweet/post about the release
4. Update any example repositories

## Troubleshooting Publishing

### "Package name too similar to existing package"

Choose a unique name or use scoped packages:
```json
{
  "name": "@yourusername/claude-swarm"
}
```

### "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Check package ownership: `npm owner ls claude-swarm`
- For first publish, the name must be available

### Build Issues

```bash
# Clean everything and rebuild
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

## Continuous Integration

Consider setting up automated publishing with GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Security Notes

1. Never publish with sensitive data
2. Use `.npmignore` or `files` in package.json
3. Review package contents before publishing
4. Set up 2FA on your npm account
5. Use npm tokens for CI/CD

## Version Management

Follow semantic versioning:
- MAJOR (1.0.0): Breaking changes
- MINOR (0.1.0): New features, backward compatible
- PATCH (0.0.1): Bug fixes, backward compatible

## Deprecation

If needed to deprecate:
```bash
npm deprecate claude-swarm@"< 2.0.0" "Upgrade to v2.0.0 for latest features"
```