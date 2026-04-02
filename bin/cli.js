#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { version } = require('../package.json');
const initCommand = require('../src/commands/init');
const projectCommand = require('../src/commands/project');
const { addAgent, addCommand, addSkill } = require('../src/commands/add');
const statusCommand = require('../src/commands/status');
const upgradeCommand = require('../src/commands/upgrade');
const createCommand = require('../src/commands/create');
const githubCommand = require('../src/commands/github');
const clearCommand = require('../src/commands/clear');
const watchCommand = require('../src/commands/watch');

program
  .name('claudeforge')
  .description('Forge production-ready AI agent projects — agents, slash commands, memory, CI/CD, and devcontainers in one command')
  .version(version);

// ── init ─────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Scaffold the Claude Code project structure (.claude/, memory/, CLAUDE.md, etc.)')
  .option('-f, --force',          'Overwrite existing files without prompting')
  .option('-n, --dry-run',        'Preview what would be created without writing anything')
  .option('-d, --dir <path>',     'Target directory (defaults to current directory)')
  .action(initCommand);

// ── project ───────────────────────────────────────────────────────────────────
program
  .command('project <description>')
  .description('Prepare your project for AI setup — writes SETUP_CONTEXT.md and guides you to run /setup-project in the Claude Code chat')
  .option('-d, --dir <path>', 'Target directory (defaults to current directory)')
  .addHelpText('after', `
No API key required. Works with any Claude model you already have access to
(GitHub Copilot, Claude.ai, or any IDE with the Claude Code extension).

Examples:
  $ claudeforge project "FastAPI REST API with PostgreSQL and Redis"
  $ claudeforge project "React + Tailwind dashboard with Supabase and Stripe"
  $ claudeforge project "Go microservice for payment processing" --dir ./my-service

After running this, open the project in your IDE and run:
  /setup-project "your description"
in the Claude Code chat window.
  `)
  .action(projectCommand);

// ── add ──────────────────────────────────────────────────────────────────────
const addCmd = program
  .command('add')
  .description('Scaffold a new agent, slash command, or skill');

addCmd
  .command('agent <name>')
  .description('Create a new sub-agent in .claude/agents/')
  .option('-d, --dir <path>',          'Target directory')
  .option('-f, --force',               'Overwrite if already exists')
  .option('--description <text>',      'Agent description (shown in frontmatter)')
  .option('--model <model>',           'Agent model: sonnet | opus | haiku', 'sonnet')
  .option('--color <color>',           'Agent color in Claude UI', 'blue')
  .addHelpText('after', `
Example:
  $ claudeforge add agent sql-reviewer --description "Reviews SQL migrations for safety"
  `)
  .action(addAgent);

addCmd
  .command('command <name>')
  .description('Create a new slash command in .claude/commands/')
  .option('-d, --dir <path>',          'Target directory')
  .option('-f, --force',               'Overwrite if already exists')
  .option('--description <text>',      'Command description (shown in command palette)')
  .addHelpText('after', `
Example:
  $ claudeforge add command deploy --description "Deploy the app to staging"
  `)
  .action(addCommand);

addCmd
  .command('skill <name>')
  .description('Create a new skill in .claude/skills/<name>/SKILL.md')
  .option('-d, --dir <path>',          'Target directory')
  .option('-f, --force',               'Overwrite if already exists')
  .option('--description <text>',      'Skill trigger description')
  .option('--no-user-invocable',       'Make this a Claude-only skill (user-invocable: false)')
  .addHelpText('after', `
Example:
  $ claudeforge add skill api-conventions --description "Apply REST API naming conventions"
  `)
  .action(addSkill);

// ── status ────────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show what is configured in this Claude Code project')
  .option('-d, --dir <path>', 'Target directory (defaults to current directory)')
  .action(statusCommand);

// ── upgrade ───────────────────────────────────────────────────────────────────
program
  .command('upgrade')
  .description('Update infrastructure templates (hooks, rules, skills) to the latest version')
  .option('-d, --dir <path>',  'Target directory (defaults to current directory)')
  .option('-n, --dry-run',     'Preview what would change without writing anything')
  .option('--all',             'Also update user-owned files (CLAUDE.md, settings.json, agents, commands) — WILL overwrite your edits')
  .addHelpText('after', `
By default, only infrastructure files are updated:
  .claude/hooks/*, .claude/rules/*, .claude/skills/project-conventions/*, memory/MEMORY.md

User-owned files (CLAUDE.md, .claude/settings.json, agents, commands, .mcp.json) are left untouched
unless you pass --all.
  `)
  .action(upgradeCommand);

// ── create ────────────────────────────────────────────────────────────────────
program
  .command('create [name]')
  .description('Interactive wizard — scaffold a new AI-powered project from scratch')
  .option('-d, --dir <path>', 'Parent directory to create the project in (defaults to current directory)')
  .addHelpText('after', `
Walks you through project name, description, stack selection, and optional
features (CI/CD, devcontainer, GitHub templates). Then runs init + project
automatically — one command to go from zero to a fully configured Claude project.

Example:
  $ claudeforge create my-api
  $ claudeforge create          # prompts for name
  `)
  .action(createCommand);

// ── github ────────────────────────────────────────────────────────────────────
program
  .command('github')
  .description('Generate GitHub Actions CI/CD, PR templates, issue templates, and devcontainer')
  .option('-d, --dir <path>',    'Target directory (defaults to current directory)')
  .option('-n, --dry-run',       'Preview what would be created without writing anything')
  .option('--stack <stack>',     'Force a stack: node | python | go | rust | generic')
  .option('--no-devcontainer',   'Skip .devcontainer/ generation')
  .option('--no-pr-template',    'Skip pull_request_template.md')
  .option('--no-issue-templates','Skip issue templates')
  .addHelpText('after', `
Auto-detects your stack and generates:
  .github/workflows/ci.yml         — lint, test, build on push/PR
  .github/pull_request_template.md — structured PR checklist
  .github/ISSUE_TEMPLATE/          — bug report + feature request templates
  .github/CODEOWNERS               — ownership file (placeholder)
  .devcontainer/devcontainer.json  — VS Code devcontainer with Claude Code

Examples:
  $ claudeforge github
  $ claudeforge github --stack python --no-devcontainer
  `)
  .action(githubCommand);

// ── clear ─────────────────────────────────────────────────────────────────────
program
  .command('clear')
  .description('Remove all claudeforge-generated files and start fresh (.claude/, memory/, CLAUDE.md, etc.)')
  .option('-d, --dir <path>', 'Target directory (defaults to current directory)')
  .option('-n, --dry-run',    'Preview what would be deleted without removing anything')
  .option('-f, --force',      'Skip confirmation prompt')
  .addHelpText('after', `
Removes everything claudeforge created:
  .claude/        — settings, agents, commands, hooks, rules, skills
  memory/         — all memory files
  CLAUDE.md       — project context file
  CLAUDE.local.md — personal context file
  .mcp.json       — MCP server config

Your source code, git history, and other project files are never touched.

Examples:
  $ claudeforge clear             # interactive confirmation
  $ claudeforge clear --dry-run   # preview what would be deleted
  $ claudeforge clear --force     # skip confirmation prompt
  `)
  .action(clearCommand);

// ── watch ─────────────────────────────────────────────────────────────────────
program
  .command('watch')
  .description('Open the live agent activity dashboard — shows which agent is running which tool in real time')
  .option('-d, --dir <path>',  'Project directory (defaults to current directory)')
  .option('-p, --port <port>', 'Dashboard port (default: 7337)')
  .option('--no-browser',      'Do not auto-open the browser')
  .addHelpText('after', `
Starts a local server at http://localhost:7337 that streams agent activity
from .claude/agent-activity.jsonl via Server-Sent Events.

The hooks scaffold by claudeforge write to this log on every Claude tool call.
Run this in a separate terminal while working in Claude Code.

Example:
  $ claudeforge watch
  $ claudeforge watch --port 8080 --no-browser
  `)
  .action(watchCommand);

program.parse(process.argv);
