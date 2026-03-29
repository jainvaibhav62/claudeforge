# claudeforge

> Forge production-ready AI agent projects — agents, slash commands, memory, CI/CD, and devcontainers in one command.

[![npm version](https://img.shields.io/npm/v/claudeforge-cli)](https://www.npmjs.com/package/claudeforge-cli)
[![PyPI version](https://img.shields.io/pypi/v/claudeforge)](https://pypi.org/project/claudeforge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Python 3.8+](https://img.shields.io/badge/python-%3E%3D3.8-blue)](https://python.org)

**No API key required.** Works with any Claude model — GitHub Copilot, Claude.ai, or any IDE with the Claude Code extension.

---

## Requirements

> **Node.js 18+ is required regardless of how you install claudeforge.**
> The CLI is built on Node.js — the pip package is a thin wrapper that delegates to it automatically.

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Required for the CLI — install first |
| npm | any | Included with Node.js |
| Python | 3.8+ | Only needed if installing via pip |
| Claude Code | latest | IDE extension for slash commands |

### Install Node.js (if you don't have it)

```bash
# macOS
brew install node

# macOS / Linux — via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows — download installer from https://nodejs.org
```

Verify:
```bash
node --version   # should print v18 or higher
```

---

## Table of Contents

- [What It Does](#what-it-does)
- [Install](#install)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
  - [create](#create--interactive-wizard)
  - [init](#init--scaffold-project-structure)
  - [project](#project--prepare-ai-context)
  - [add](#add--scaffold-agents-commands-skills)
  - [github](#github--cicd--devcontainer)
  - [status](#status--show-whats-configured)
  - [upgrade](#upgrade--update-built-in-templates)
- [Slash Commands (in IDE chat)](#slash-commands-in-ide-chat)
- [What Gets Scaffolded](#what-gets-scaffolded)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)

---

## What It Does

`claudeforge` gives you a production-ready Claude Code setup:

- **Interactive wizard** (`create`) — go from zero to a fully configured project in one command
- **9 slash commands** for your daily workflow — `/setup-project`, `/commit`, `/review-pr`, `/scaffold-structure`, `/standup`, `/fix-issue`, `/explain-codebase`, `/project-health`, `/memory-sync`
- **A thorough code-reviewer agent** that checks correctness, security, performance, test coverage, style, and documentation
- **GitHub Actions CI/CD** auto-generated for your stack (Node, Python, Go, Rust)
- **VS Code devcontainer** with the Claude Code extension pre-configured
- **Hook scripts** that block dangerous operations before they run
- **A memory system** that persists project context across every Claude session

---

## Install

### via npm (recommended)

Best if you already have Node.js installed.

```bash
npm install -g claudeforge-cli
```

### via pip / uv

Best if you primarily work in Python environments. Node.js 18+ must still be installed on your system (see [Requirements](#requirements) above).

```bash
# pip
pip install claudeforge

# uv (recommended — installs as a global CLI tool)
uv tool install claudeforge
```

> **Important:** If using `uv`, use `uv tool install` — not `uv pip install`. The `pip` variant installs into a virtualenv and won't put `claudeforge` on your PATH.

> The pip/uv package is a thin wrapper — when you run `claudeforge`, it locates Node.js on your PATH and delegates all commands to the Node.js CLI automatically.

### Verify installation

```bash
claudeforge --version
```

---

## Quick Start

### Option A — Interactive wizard (fastest)

```bash
claudeforge create my-api
```

Walks you through project name, description, stack, and optional features (CI/CD, devcontainer, Docker). Then runs everything automatically.

### Option B — Manual setup

```bash
# 1. Go to your project directory
cd my-project

# 2. Scaffold the Claude Code structure
claudeforge init

# 3. Generate CI/CD and devcontainer
claudeforge github

# 4. Prepare AI context (detects your tech stack automatically)
claudeforge project "FastAPI REST API with PostgreSQL and Redis"

# 5. Open the project in VS Code / JetBrains / any IDE with Claude Code
# 6. In the Claude Code chat window, run:
#    /setup-project "FastAPI REST API with PostgreSQL and Redis"

# Claude will fill in CLAUDE.md, settings, agents, commands, and memory
# tailored to your exact stack — no manual editing required.

# 7. Then run:
#    /scaffold-structure
# to create src/, tests/, and starter files for your stack.
```

---

## CLI Commands

### `create` — Interactive wizard

```bash
claudeforge create my-api
claudeforge create              # prompts for name
claudeforge create --dir ~/Projects
```

Walks you through:

1. Project name
2. Description (used by Claude to AI-configure everything)
3. Tech stack selection
4. Optional features: GitHub Actions CI/CD, devcontainer, Docker files

Then runs `init`, `project`, and `github` automatically — one command from zero to fully configured.

---

### `init` — Scaffold project structure

```bash
claudeforge init
claudeforge init --dir ./my-project
claudeforge init --dry-run     # preview without writing
claudeforge init --force       # overwrite existing files
```

Creates 25 files across the full Claude Code structure. Run this once per project.

**What gets created:**

| Path | Purpose |
|------|---------|
| `.claude/settings.json` | Team-shared permissions, model, hooks |
| `.claude/settings.local.json` | Personal overrides (gitignored) |
| `.claude/agents/code-reviewer.md` | 7-category code review agent |
| `.claude/commands/` | 9 slash commands (see below) |
| `.claude/hooks/pre-tool-use.sh` | Blocks rm -rf, curl\|bash, .env edits |
| `.claude/hooks/post-tool-use.sh` | Reminds to run tests after edits |
| `.claude/rules/no-sensitive-files.md` | Rule: don't touch secrets |
| `.claude/skills/project-conventions/` | Style skill loaded before writing code |
| `memory/MEMORY.md` | Index — always loaded by Claude |
| `memory/user_profile.md` | Your role and preferences (gitignored) |
| `memory/feedback_communication.md` | How Claude should behave |
| `memory/project_ai_workflow.md` | AI conventions for this project |
| `CLAUDE.md` | Project context template |
| `CLAUDE.local.md` | Personal context (gitignored) |
| `.mcp.json` | MCP servers (context7 pre-configured) |
| `.env.example` | Environment variable documentation |
| `.gitignore` | Covers secrets, local settings, OS artifacts |

---

### `project` — Prepare AI context

```bash
claudeforge project "describe your project in plain English"
```

Detects your tech stack from existing files (`package.json`, `go.mod`, `requirements.txt`, etc.), writes a `SETUP_CONTEXT.md` with full context, and tells you the exact command to run in Claude Code chat.

```bash
# Examples
claudeforge project "Next.js SaaS with Stripe, Prisma, and Clerk auth"
claudeforge project "Go gRPC microservice with PostgreSQL and Redis cache"
claudeforge project "Django REST API with Celery, RabbitMQ, and S3"
claudeforge project "Rust CLI tool for parsing and transforming CSV files"
```

After running, open Claude Code and run `/setup-project "your description"` in chat.

---

### `add` — Scaffold agents, commands, skills

```bash
# Add a specialized agent
claudeforge add agent <name> [--description "..."] [--model sonnet|opus|haiku] [--color blue]

# Add a slash command
claudeforge add command <name> [--description "..."]

# Add a skill
claudeforge add skill <name> [--description "..."] [--no-user-invocable]
```

```bash
# Real examples
claudeforge add agent sql-reviewer \
  --description "Reviews SQL migrations for safety, performance, and rollback safety"

claudeforge add command deploy \
  --description "Run pre-deploy checks, deploy to staging, run smoke tests"

claudeforge add skill api-conventions \
  --description "Apply REST API naming and response conventions before writing endpoints"
```

| Flag | Description |
|------|-------------|
| `--description <text>` | Frontmatter description (important — determines when Claude invokes it) |
| `-f, --force` | Overwrite if file already exists |
| `-d, --dir <path>` | Target directory |
| `--model <model>` | (agent only) model override |
| `--color <color>` | (agent only) color in Claude UI |
| `--no-user-invocable` | (skill only) Claude-only, not user-invocable |

---

### `github` — CI/CD & devcontainer

```bash
claudeforge github
claudeforge github --dry-run          # preview without writing
claudeforge github --stack python     # force stack detection
claudeforge github --no-devcontainer  # skip devcontainer
```

Auto-detects your stack and generates:

| Path | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Lint, test, build on push/PR |
| `.github/pull_request_template.md` | Structured PR checklist |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |
| `.github/CODEOWNERS` | Ownership file |
| `.devcontainer/devcontainer.json` | VS Code devcontainer with Claude Code |

CI workflows are generated for: **Node.js**, **Python**, **Go**, **Rust**, and **generic**.

---

### `status` — Show what's configured

```bash
claudeforge status
claudeforge status --dir ./my-project
```

Prints a full summary:

```
  Core Files        ✓ 8/8 present
  Settings          Model: claude-sonnet-4-6  |  13 allowed, 4 denied  |  2 hooks
  MCP Servers       context7, postgres
  Agents (3)        code-reviewer, api-reviewer, db-reviewer
  Slash Commands    9 commands configured
  Skills (2)        project-conventions, api-conventions
  Memory (4 files)  ● 3 filled  ○ 1 empty template
```

---

### `upgrade` — Update built-in templates

```bash
claudeforge upgrade             # update hooks, rules, built-in commands
claudeforge upgrade --dry-run   # preview changes
claudeforge upgrade --all       # also update CLAUDE.md, settings.json, agents (⚠ overwrites edits)
```

By default, only **infrastructure files** are updated (hook scripts, rules, built-in slash commands). Your edited files (`CLAUDE.md`, `settings.json`, custom agents) are untouched.

---

## Slash Commands (in IDE chat)

Run these in the Claude Code chat window in VS Code, JetBrains, or any Claude Code IDE. Works with any Claude model — no separate API key.

### Setup & Maintenance

| Command | When to run | What it does |
|---------|-------------|-------------|
| `/analyze-project` | Existing project, no description needed | Reads your actual codebase — code, patterns, conventions, git history — and generates the full Claude Code setup automatically |
| `/setup-project "description"` | New project or when you want to describe it manually | Fills in CLAUDE.md, settings, .env.example, .mcp.json, memory, generates project-specific skills, agents, and commands |
| `/scaffold-structure` | After `/setup-project` | Creates the actual `src/`, `tests/`, `cmd/` directory structure with real starter files for your stack |
| `/project-health` | Weekly / after big changes | Audits your setup: checks CLAUDE.md completeness, hook coverage, memory fill level, and gives prioritized improvement suggestions |
| `/memory-sync` | End of work session | Reviews the session and updates `memory/` files with preferences, decisions, and project context |

### Daily Development

| Command | When to run | What it does |
|---------|-------------|-------------|
| `/commit` | After completing a feature | Reads `git diff`, stages relevant files, writes a conventional commit message |
| `/review-pr` | Before opening a PR | Reviews the branch diff — correctness, security, tests, style — with severity ratings |
| `/fix-issue "error message"` | When something breaks | Locates the bug, forms a hypothesis, makes a minimal targeted fix, verifies with tests |
| `/standup ["last 3 days"]` | Morning standup | Generates a concise update from recent git commits and open PRs |
| `/explain-codebase ["area"]` | Onboarding / exploring | Explains architecture, key flows, and what to read first |

---

## What Gets Scaffolded

### `code-reviewer` Agent (7 categories)

Reviews changed code across:
1. **Correctness** — logic errors, edge cases, async issues
2. **Security** — hardcoded secrets, injection, path traversal, SSRF
3. **Error Handling** — swallowed errors, missing timeouts, resource leaks
4. **Performance** — N+1 queries, unbounded growth, blocking calls
5. **Test Coverage** — happy path, error paths, edge cases, assertions
6. **Style** — naming, magic numbers, dead code, DRY
7. **Documentation** — missing docstrings, stale docs, changelog

Returns: `✓ LGTM` / `~ LGTM with suggestions` / `⚠ Address warnings` / `✗ Needs changes`

### Hook Scripts (auto-`chmod 755`)

**`pre-tool-use.sh`** blocks before every tool call:
- `rm -rf` on absolute paths outside `/tmp`
- Editing `.env`, credentials, key files (warns first)
- `curl | bash` and `wget | sh` patterns

**`post-tool-use.sh`** injects reminders:
- Prompts to run tests after editing test files

### Memory System

Four structured memory files — Claude reads them every session:

| File | What it stores | Gitignored? |
|------|---------------|-------------|
| `MEMORY.md` | Index of all memory files | No |
| `user_profile.md` | Your role, background, preferences | Yes |
| `feedback_communication.md` | How Claude should behave | No |
| `project_ai_workflow.md` | AI conventions for this project | No |

---

## How It Works

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   Terminal CLI               │     │   Claude Code (IDE chat)      │
│                             │     │                               │
│  create my-api  ────────────┼─────┼▶  init + project + github    │
│                             │     │                               │
│  init           ────────────┼─────┼▶  .claude/ structure created  │
│  project "..."  ────────────┼─────┼▶  SETUP_CONTEXT.md written   │
│  github         ────────────┼─────┼▶  CI/CD + devcontainer       │
│                             │     │                               │
│                             │◀────┼─  /setup-project "..."        │
│                             │     │    ↳ fills CLAUDE.md          │
│                             │     │    ↳ updates settings.json   │
│                             │     │    ↳ creates agents          │
│                             │     │    ↳ creates commands        │
│                             │     │    ↳ documents every file    │
│                             │     │                               │
│                             │◀────┼─  /scaffold-structure         │
│                             │     │    ↳ creates src/, tests/    │
│                             │     │    ↳ writes starter files    │
│                             │     │                               │
│  add agent ...  ────────────┼─────┼▶  template created           │
│  status         ────────────┼─────┼▶  summary printed            │
│  upgrade        ────────────┼─────┼▶  hooks/rules updated        │
└─────────────────────────────┘     └──────────────────────────────┘
```

The CLI handles file scaffolding. The AI work happens inside the IDE where Claude has full tool access to read, write, and run commands — no separate API key needed.

---

## Troubleshooting

**`claudeforge: command not found` after npm install**
```bash
# Ensure npm global bin is on PATH
export PATH="$(npm prefix -g)/bin:$PATH"
# Add to ~/.zshrc or ~/.bashrc to persist
```

**`claudeforge: command not found` after pip install**
```bash
# Ensure pip user bin is on PATH
export PATH="$HOME/.local/bin:$PATH"
# Add to ~/.zshrc or ~/.bashrc to persist
```

**`claudeforge: command not found` after `uv pip install`**

`uv pip install` puts packages into a virtualenv, not on your PATH. Use `uv tool install` instead:
```bash
uv tool install claudeforge
```

**`Node.js is required but was not found on PATH`**

This happens when installing via pip — Node.js must be installed separately.

```bash
# macOS
brew install node

# macOS / Linux — via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

After installing Node.js, open a new terminal and retry.

**`/setup-project` didn't generate anything**
Make sure you ran `claudeforge init` first — the `.claude/commands/` directory must exist for slash commands to work.

**Hook scripts not running**
```bash
# Verify hooks are executable
ls -la .claude/hooks/
# Re-apply execute permission
chmod 755 .claude/hooks/*.sh
# Re-run init to restore hooks
claudeforge init --force
```

**`claudeforge upgrade` overwrote my custom changes**
Only use `--all` flag when you want to reset user-owned files. Without `--all`, only infrastructure files (hooks, rules, built-in commands) are updated.

**Slash commands not showing in IDE**
Confirm you're running Claude Code (not just Copilot Chat). The `.claude/commands/` directory must be in the project root. Restart the IDE after running `init`.

---

## License

MIT
