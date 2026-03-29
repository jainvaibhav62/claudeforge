---
description: Analyze an existing codebase and auto-generate the full Claude Code setup — CLAUDE.md, skills, agents, commands, and memory — by reading actual code, patterns, and conventions already in the project. No description required.
allowed-tools: Read, Write, Edit, MultiEdit, Bash(git log:*), Bash(git diff:*), Bash(ls:*), Bash(find:*), Bash(cat:*), Bash(wc:*)
---

## Step 1 — Deep Codebase Scan

Do not ask the user for a description. Read the codebase directly to infer everything.

### 1a. Project identity

!`ls -la`
!`test -f package.json && cat package.json || test -f pyproject.toml && cat pyproject.toml || test -f go.mod && cat go.mod || test -f Cargo.toml && cat Cargo.toml || echo "(no manifest found)"`
!`test -f README.md && head -60 README.md || echo "(no README)"`

### 1b. Full dependency map

!`test -f package.json && cat package.json || echo "(no package.json)"`
!`test -f requirements.txt && cat requirements.txt || test -f pyproject.toml && cat pyproject.toml || echo "(no python deps)"`
!`test -f go.mod && cat go.mod || echo "(no go.mod)"`
!`test -f Cargo.toml && cat Cargo.toml || echo "(no Cargo.toml)"`
!`test -f pom.xml && head -80 pom.xml || echo "(no pom.xml)"`
!`test -f Gemfile && cat Gemfile || echo "(no Gemfile)"`

### 1c. Project structure

!`find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.rb" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/__pycache__/*" -not -path "*/target/*" | head -80`
!`find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/__pycache__/*" -not -path "*/target/*" -not -path "*/dist/*" | head -40`

### 1d. Read actual source code — infer real patterns

Read the most representative files in each layer of the project. For each category below, find and read 2–3 real files:

- **Entry points**: `main.py`, `index.ts`, `main.go`, `app.py`, `server.js`, etc.
- **Route/controller layer**: files in `routes/`, `controllers/`, `handlers/`, `api/`, `pages/api/`
- **Service/business logic layer**: files in `services/`, `lib/`, `internal/`, `core/`
- **Data/database layer**: files in `models/`, `db/`, `prisma/`, `migrations/`, `schema/`
- **UI components** (if frontend): files in `components/`, `pages/`, `views/`, `screens/`
- **Tests**: files in `tests/`, `__tests__/`, `spec/`, `test/`
- **Config**: `tsconfig.json`, `eslint.config.*`, `.prettierrc`, `pytest.ini`, `ruff.toml`, etc.

Read enough code to answer:
- What frameworks and libraries are actually used (not just listed in deps)?
- How are files structured and named?
- What patterns repeat across files (error handling, auth checks, response format, logging)?
- What conventions are enforced (naming, imports, exports)?
- How are tests written?

### 1e. Git history — understand how the project evolved

!`git log --oneline -20 || echo "(no git history)"`
!`git log --pretty=format:"%s" -50 | sort | uniq -c | sort -rn | head -20 || echo "(no commits)"`

What do the commit messages reveal about the team's workflow and focus areas?

### 1f. Existing CI/CD and infrastructure

!`test -d .github/workflows && find .github/workflows -name "*.yml" | head -5 | xargs head -100 || echo "(no GitHub Actions)"`
!`test -f Dockerfile && head -40 Dockerfile || echo "(no Dockerfile)"`
!`test -f docker-compose.yml && cat docker-compose.yml || echo "(no docker-compose)"`
!`test -f .env.example && cat .env.example || test -f .env.sample && cat .env.sample || echo "(no .env.example)"`

---

## Step 2 — Build a Mental Model of the Project

Before writing any files, reason through what you found:

1. **What does this project do?** — infer from code, not just README
2. **What is the architecture?** — layers, boundaries, data flow
3. **What are the distinct technical domains?** — each will become a skill
4. **What conventions are already established?** — naming, patterns, idioms in real use
5. **What are the high-risk areas?** — where bugs are costly (payments, auth, data, migrations)
6. **What does the team care about?** — infer from commit patterns, test coverage, CI config
7. **What is missing or inconsistent?** — patterns that are partially established but not enforced

---

## Step 3 — Generate the Full Claude Code Setup

Using only what you observed — no assumptions, no generic advice — generate all files.

### 3a. Write `CLAUDE.md`

Write a complete `CLAUDE.md` based on the actual project:

**Header**: Real project name and a one-line description inferred from the code.

**Commands table**: Only commands that actually exist in the project (from `package.json` scripts, `Makefile`, CI config, etc.). Do not invent commands.

**Architecture**: An accurate directory tree of the real project structure with a description of each folder's purpose — inferred from what files are actually there.

**Code Style**: Conventions observed in the actual code — not generic guidelines. Examples:
- "Functions use early return pattern — no nested if/else"
- "All async functions are wrapped in the shared `tryCatch` utility from `lib/errors.ts`"
- "Database queries always go through `src/db/client.ts` — never import Prisma directly"

**Environment Variables**: Table built from `.env.example`, config files, and any `process.env` / `os.environ` references found in the code.

**Gotchas**: Real non-obvious things found in the code — not generic stack gotchas. Look for comments like `// important`, `// NOTE`, `// FIXME`, `# WARNING`, unusual patterns, or workarounds.

**Workflow**: How to use Claude Code slash commands and agents with this specific project.

---

### 3b. Update `.claude/settings.json`

Read the current file, then add permissions for the commands and tools the project actually uses (from CI config, Makefile, package.json scripts).

---

### 3c. Write `.env.example` (if missing or incomplete)

If `.env.example` is missing or sparse, generate a complete one from:
- Existing `.env.example` / `.env.sample`
- All `process.env.X`, `os.environ["X"]`, `viper.GetString("X")` references in the code
- Any config files that reference environment variables

---

### 3d. Create Skills — One Per Observed Domain

For each distinct technical domain found in the codebase, create a skill at `.claude/skills/<domain>/SKILL.md`.

The skill must reflect **actual conventions in this codebase** — read from real code, not inferred from the framework name. For example:

- If the project uses Express, read how routes are actually structured in this project, how middleware is applied, how errors are returned — and write that into the skill
- If the project uses React, read how components are actually written here — hooks, prop patterns, styling approach, state management — and write that in
- If the project uses PostgreSQL, read how queries are written — raw SQL vs ORM, transaction patterns, connection handling — and write that in

Each skill must include:
1. **What this domain covers** in this project — which files/folders
2. **Naming and file conventions** — as actually observed
3. **Key patterns** — with short code snippets taken or adapted from the real codebase
4. **Integration points** — how this domain connects to others in this project
5. **Gotchas** — non-obvious things found in the actual code

`description` frontmatter: write as a precise trigger — when should Claude load this skill?

Always create/update the base `project-conventions` skill with cross-cutting conventions observed across the whole codebase.

---

### 3e. Create Agents — Reviewers for High-Risk Domains

Identify which domains in this project carry the most risk if done wrong. Only create reviewer agents for those.

Reviewer checklists must be built from what you observed:
- If the project has a custom auth pattern, the `security-auditor` checklist must check for that pattern
- If the project uses a specific migration tool, the `db-reviewer` checklist must include migration-specific checks for that tool
- If the project has payment logic, the `stripe-reviewer` (or equivalent) checklist must reflect the actual payment flow

Always create:
- `code-reviewer.md` — general review tailored to this project's conventions
- `security-auditor.md` — security review tailored to the auth and data patterns in this code

---

### 3f. Create Slash Commands

Create 2–4 slash commands for the workflows the team clearly uses (inferred from CI, Makefile, commit patterns):

- If the project has a test suite → `/test`
- If the project has migrations → `/migrate`
- If the project deploys → `/deploy`
- If the project has a linter/formatter → include in `/test` or as a step in `/commit`

Each command must use `!` to pull live context (e.g., `!git diff`, `!npm test 2>&1`).

---

### 3g. Write `memory/project_ai_workflow.md`

Document:
- Which skill loads for which task
- Which agent to invoke and when
- Project-specific AI conventions based on what was found (e.g., "always read `src/schema.ts` before modifying any API types")
- Any architectural decisions that Claude must respect

---

## Step 4 — Document Every File Generated

Add headers to each file explaining what it is and how to customize it (same format as `/setup-project`).

---

## Step 5 — Write `SETUP_SUMMARY.md`

```markdown
# Claude Code Setup Summary

Analyzed and generated by `/analyze-project` on [today's date].

## What Was Observed

- **Stack**: [detected stack]
- **Architecture**: [brief description]
- **Domains identified**: [list]
- **High-risk areas**: [list]

## What Was Generated

| File | Based On |
|------|---------|
| `CLAUDE.md` | Actual project structure, commands, and code conventions |
| Skills | Conventions observed in real source files per domain |
| Agents | High-risk areas identified in the codebase |
| Commands | Workflows found in CI, Makefile, package.json scripts |
| `.env.example` | Environment references found throughout the codebase |

## Skills Available

| Skill | Loaded When |
|-------|------------|
| `project-conventions` | Always |
| *(domain skills)* | See `.claude/skills/` |

## Agents Available

| Agent | Invoked When |
|-------|-------------|
| `code-reviewer` | Before every PR |
| `security-auditor` | Auth, secrets, input handling |
| *(domain reviewers)* | See `.claude/agents/` |

## Next Steps

1. Review `CLAUDE.md` — verify the commands table matches your actual workflow
2. Skim the generated skills — adjust any conventions that were misread
3. Run `/project-health` to audit the setup
4. Delete this file once you've reviewed it
```

---

## Step 6 — Final Summary

Print what was generated:
1. Every skill created — what domain it covers and its trigger condition
2. Every agent created — what it reviews and when it triggers
3. Every slash command created
4. Any gaps found (e.g., missing `.env.example`, no tests detected, no CI config)
5. Suggested next step
