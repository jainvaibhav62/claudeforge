---
description: AI-fill the complete Claude Code project configuration. Run after `claudeforge project "description"` — or run it directly with your project description as the argument. Generates CLAUDE.md, settings, skills, agents, commands, memory, and more.
allowed-tools: Read, Write, Edit, MultiEdit, Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(find:*), Bash(cat:*), Bash(rm:*)
---

## Step 1 — Gather All Context

Read the project setup context if it was prepared by the CLI:

!`test -f SETUP_CONTEXT.md && cat SETUP_CONTEXT.md || echo "(no SETUP_CONTEXT.md — using argument and detected files)"`

Detect the project's current state:

- Root directory: !`ls -la`
- Tech stack files: !`ls package.json requirements.txt pyproject.toml go.mod Cargo.toml pom.xml Gemfile composer.json tsconfig.json next.config.js vite.config.ts docker-compose.yml Dockerfile 2>/dev/null || echo "(none detected)"`
- package.json: !`test -f package.json && cat package.json || echo "(none)"`
- Python deps: !`test -f requirements.txt && cat requirements.txt || test -f pyproject.toml && cat pyproject.toml || echo "(none)"`
- Go module: !`test -f go.mod && cat go.mod || echo "(none)"`
- Existing CLAUDE.md: !`cat CLAUDE.md 2>/dev/null || echo "(not yet written)"`
- Git history: !`git log --oneline -5 2>/dev/null || echo "(no commits yet)"`

**My project**: $ARGUMENTS

---

## Step 2 — Fill Every Configuration File

Using all context above, generate tailored content for each file. Be specific and opinionated — no placeholders, no generic examples. Every value should reflect the actual tech stack.

### 2a. Rewrite `CLAUDE.md`

Write a complete `CLAUDE.md` that includes:

**Header**: Project name (infer from package.json/go.mod/directory name) and one-line description.

**Commands table**: Real commands for this exact stack — not placeholders. Examples:
- Python/FastAPI: `uvicorn src.main:app --reload`, `pytest`, `ruff check .`, `alembic upgrade head`
- Node.js/Next.js: `npm run dev`, `npm test`, `npm run build`, `npx prisma migrate dev`
- Go: `go run ./cmd/server`, `go test ./...`, `golangci-lint run`, `go build -o bin/app ./cmd/server`

**Architecture**: Directory tree of what the project structure should look like once scaffolded.

**Code Style**: Specific conventions — naming, imports, error handling, test patterns — for this stack.

**Environment Variables**: Table with Name, Description, Required columns — matching `.env.example`.

**Gotchas**: 3–5 non-obvious things about this stack (e.g., "FastAPI route order matters — more specific routes must be declared before generic ones").

**Workflow**: How to use `/commit`, `/review-pr`, and which skills and agents apply to this project.

### 2b. Update `.claude/settings.json`

Read the current file first, then merge in stack-appropriate additions:

```
Read: .claude/settings.json
```

Add to `permissions.allow` for the detected stack:
- Python: `Bash(pytest:*)`, `Bash(ruff:*)`, `Bash(mypy:*)`, `Bash(alembic:*)`, `Bash(pip:*)`
- Node.js: `Bash(npm run:*)`, `Bash(npx:*)`, `Bash(node:*)`
- Go: `Bash(go test:*)`, `Bash(go build:*)`, `Bash(go run:*)`, `Bash(golangci-lint:*)`
- Docker: `Bash(docker-compose:*)`, `Bash(docker build:*)`, `Bash(docker run:*)`

Keep all existing keys (model, hooks, deny list).

### 2c. Write `.env.example`

Generate a real `.env.example` grouped by category. Each variable needs:
- A comment explaining what it's for and where to get it
- A realistic example value
- A `(required)` or `(optional)` marker

Include variables for: the app itself, any databases mentioned, any external APIs implied by the description, and any auth/session configuration.

### 2d. Update `.mcp.json`

Always keep `context7`. Add servers based on the stack:
- PostgreSQL mentioned → `@modelcontextprotocol/server-postgres`
- Web app with browser testing → `@playwright/mcp` or `@modelcontextprotocol/server-puppeteer`
- GitHub integration → `@modelcontextprotocol/server-github`
- File-heavy operations → `@modelcontextprotocol/server-filesystem`

### 2e. Rewrite `memory/project_ai_workflow.md`

Write a complete, project-specific workflow document:
- Which skills load automatically and when (be explicit: "the `prisma` skill loads whenever writing database queries")
- Which agents to use and when (be explicit: "use `security-auditor` whenever adding auth or payment logic")
- Which slash commands map to which tasks
- MCP servers available and how to invoke them
- Project-specific AI conventions (e.g., "always read `src/db/schema.py` before writing queries")
- Any architectural decisions that Claude should know and respect

---

### 2f. Infer and Create Skills — Domain Specialists

**Skills** live in `.claude/skills/` and are loaded as context *before* Claude writes code. They encode how to write code correctly for a specific domain in this project — like a senior developer's internal style guide baked into Claude's context.

#### Step 1 — Identify the distinct technical domains in this project

Read the project description and detected files. Extract every distinct technical concern that has its own patterns, conventions, or APIs. Each is a candidate for a skill. Think domain-by-domain:

- "Next.js SaaS with Stripe, Prisma, and Clerk auth"
  → domains: Next.js components/pages, Stripe payments, Prisma queries, Clerk authentication
- "Go gRPC microservice with PostgreSQL and Redis"
  → domains: gRPC service definitions, PostgreSQL queries, Redis caching
- "React Native app with Firebase and Expo"
  → domains: React Native screens/navigation, Firebase Firestore, Firebase Auth, Expo config
- "Django REST API with Celery and S3"
  → domains: Django REST endpoints, Celery tasks, S3 file handling
- "Rust CLI tool for CSV parsing"
  → domains: CLI argument parsing, CSV parsing/transformation, Rust error handling

There is no fixed number — create as many skills as there are meaningful, distinct domains with non-obvious conventions. A simple project may need 2. A complex one may need 6.

#### Step 2 — Create a SKILL.md for each domain

Each skill lives at `.claude/skills/<domain-name>/SKILL.md`.

Every skill file must have:

```
---
description: "<precise trigger condition — when should Claude load this skill>"
---
```

The `description` is the most important field. Write it as a specific trigger condition so Claude loads it at exactly the right moment:
- Good: `"Load when writing or modifying any Stripe payment intent, webhook handler, or subscription logic"`
- Bad: `"Stripe knowledge"`

The skill body must read like a senior developer's internal guide for this domain in this specific project. Include:

1. **Overview** — what this domain does in this project, which files/folders it lives in
2. **Conventions** — naming patterns, file structure, how new files should be organized
3. **Key patterns** — the specific way this project does things (e.g., "all Prisma queries go through `src/lib/db.ts`, never import PrismaClient directly")
4. **Integration points** — how this domain connects to others (e.g., "Stripe webhooks call the same service layer as the REST API")
5. **Common mistakes** — non-obvious pitfalls specific to this stack/version
6. **Examples** — 1–2 short, concrete code snippets showing the right pattern for this project

#### Step 3 — Always create the base `project-conventions` skill

Update `.claude/skills/project-conventions/SKILL.md` with project-specific conventions:
- Commit message format
- PR conventions
- General code style rules that apply across all domains
- How to name files, variables, functions in this project

---

### 2g. Infer and Create Agents — Reviewers and Auditors

**Agents** live in `.claude/agents/` and are invoked as focused subagents to *review, audit, or run a workflow* independently. They have tool access. Do not create agents for writing code — that is what skills are for.

#### Step 1 — Identify domains that have non-obvious review risks

Not every domain needs a reviewer agent. Only create one when a focused checklist genuinely adds value — e.g., database migrations (irreversible), payment flows (financial risk), auth logic (security risk), caching strategies (correctness risk).

Examples by project type:
- "Next.js SaaS with Stripe, Prisma, and Clerk" → `stripe-reviewer` (payment correctness), `db-reviewer` (migration safety)
- "Go gRPC microservice with PostgreSQL and Redis" → `db-reviewer` (query performance), `api-reviewer` (gRPC contract safety)
- "React Native app with Firebase" → `security-auditor` (Firebase rules, auth), `performance-reviewer` (React Native render performance)
- "Django REST API with Celery" → `api-reviewer` (REST conventions), `db-reviewer` (ORM query safety)

#### Step 2 — Create a reviewer agent for each high-risk domain

Each agent file at `.claude/agents/<name>.md` must have:

```
---
description: "<precise trigger — when Claude should invoke this agent>"
---
```

The agent body must include:
1. A focused role statement — what this agent reviews and why it matters
2. A numbered checklist specific to this stack and domain
3. A clear output format: severity rating per issue, actionable fix suggestion

#### Step 3 — Always create these two agents regardless of project type

- `code-reviewer.md` — General code review across correctness, error handling, style, test coverage, and documentation. Invoked before every PR.
- `security-auditor.md` — Reviews any code touching auth, secrets, input validation, or external APIs. No tool access restrictions.

#### Rules for all agents

- `description` must be a specific trigger condition, not a job title
- Reviewer checklists must be tailored to the actual stack — not generic
- Every agent must have a clear output format with severity levels

---

### 2h. Create 2–4 Slash Commands

Create command files in `.claude/commands/` specific to this workflow:

**Common by stack:**
- Python: `test.md` (runs pytest with coverage, explains failures), `migrate.md` (runs Alembic, validates schema)
- Node.js: `test.md` (runs the test suite, explains failures), `typecheck.md` (runs tsc, explains type errors)
- Any DB project: `seed.md` (seeds the database with realistic test data)
- Any deployed project: `deploy.md` (pre-deploy checklist + deploy command + smoke test)

Each command must use `!` dynamic context (e.g., `!git diff`, `!npm test 2>&1`) and have a clear `## Task` section.

### 2i. Append `.gitignore` Tech-Stack Patterns

Append a labeled section with patterns for this stack. Examples:
- Python: `__pycache__/`, `*.pyc`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `dist/`, `*.egg-info/`
- Node.js: already covered by base template
- Go: `bin/`, `*.exe`, `*.test`, `coverage.out`
- Rust: `target/`

---

## Step 3 — Clean Up

Delete the context file if it exists:

```bash
rm -f SETUP_CONTEXT.md
```

---

## Step 4 — Document Every File Generated

After all files are written, go back and add a documentation header to each one so users know what they're looking at and what to customize.

**CLAUDE.md** — add at the top after the title:
```
> **Setup status**: Generated by claudeforge. Update the Commands table with your actual
> project commands after verifying them. Fill in the Gotchas section as you discover them.
```

**`.claude/settings.json`** — add a `_readme` key:
```json
"_readme": "Team-shared Claude Code settings. Personal overrides go in settings.local.json (gitignored)."
```

**Each skill file** — after the frontmatter, add:
```
<!-- WHAT THIS IS: A skill that loads as context when Claude works in this domain.
     HOW IT WORKS: Claude reads this automatically before writing code that matches the description.
     HOW TO CUSTOMIZE: Update the patterns and examples below as your project evolves.
     THINGS TO ADD: New conventions, discovered gotchas, team-specific patterns. -->
```

**Each agent file** — after the frontmatter, add:
```
<!-- WHAT THIS IS: A reviewer agent Claude invokes to audit this domain.
     HOW TO INVOKE: Claude uses this automatically when the task matches the description.
     HOW TO CUSTOMIZE: Edit the checklist items to match your project's specific patterns. -->
```

**Each command file** — after the frontmatter, add:
```
<!-- WHAT THIS IS: A slash command. Run it with /[name] in the Claude Code chat.
     HOW IT WORKS: Claude reads the ## Context section (! lines run as shell commands)
     then follows the ## Task instructions.
     HOW TO CUSTOMIZE: Edit the ## Task section. Add more ! context lines if needed. -->
```

**memory/project_ai_workflow.md** — add at the top:
```
<!-- Update this file as your AI workflow evolves. Claude reads it every session.
     The more specific you are, the less you'll need to re-explain things to Claude. -->
```

---

## Step 5 — Write `SETUP_SUMMARY.md`

Create a `SETUP_SUMMARY.md` in the project root:

```markdown
# Claude Code Setup Summary

Generated by `/setup-project` on [today's date].

## What Was Generated

| File | What It Does | Key Things to Customize |
|------|-------------|------------------------|
| `CLAUDE.md` | Project context loaded every session | Update Commands table with real commands; add Gotchas as you discover them |
| `.claude/settings.json` | Permissions + hooks for Claude Code | Add more allowed commands as you expand your workflow |
| `.env.example` | Documents required env vars | Update with any new vars; never commit real values |
| `.mcp.json` | MCP servers your team shares | Add connection strings to .env for any DB servers |
| `memory/project_ai_workflow.md` | AI conventions for this project | Update as your workflow evolves; Claude reads this every session |
| [skill files] | Domain expertise loaded before writing code | Update conventions as the project evolves |
| [agent files] | Specialized reviewer agents | Customize checklists to add project-specific patterns |
| [command files] | Slash commands for your workflow | Edit the ## Task section to match your exact needs |

## Skills Available

Claude loads these automatically before writing code in each domain:

| Skill | Loaded When |
|-------|------------|
| `project-conventions` | Always — applies to all code |
| *(project-specific skills)* | See `.claude/skills/` for the full list |

## Agents Available

Claude invokes these automatically to review and audit:

| Agent | Invoked When |
|-------|-------------|
| `code-reviewer` | After writing code, before PR |
| `security-auditor` | Any auth, secrets, or input-handling code |
| *(project-specific reviewers)* | See `.claude/agents/` for the full list |

## Slash Commands Available

Run these in the Claude Code chat window:

| Command | When to Use |
|---------|------------|
| `/setup-project` | Re-run project setup with a new description |
| `/commit` | After completing a task — creates a conventional commit |
| `/review-pr` | Before opening a PR — structured diff review |
| `/project-health` | Weekly — audits your setup and suggests improvements |
| `/memory-sync` | End of session — persists what Claude learned today |
| `/standup` | Morning — generates standup from yesterday's commits |
| `/scaffold-structure` | Once — creates the src/, tests/, etc. directory structure |
| [project commands] | See .claude/commands/ for project-specific commands |

## Next Steps

1. **Verify commands** in `CLAUDE.md` — run each one and confirm they work
2. **Create `.env`** from `.env.example` — fill in real values
3. **Run `/scaffold-structure`** in Claude Code chat to create the project directory layout
4. **Open Claude Code** in this directory and start building
5. Delete this file once you've read it
```

---

## Step 6 — Final Summary

Print a clear summary of everything that was done:

1. List every skill created with its trigger description
2. List every agent created with its trigger description
3. List every slash command created with its use case
4. State the exact next step: "Run `/scaffold-structure` in Claude Code to create your project's directory structure"
