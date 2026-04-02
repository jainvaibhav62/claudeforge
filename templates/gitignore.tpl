# ── Claude Code — personal / local files (not team-shared) ──────────────────
.claude/settings.local.json
CLAUDE.local.md

# Claude Code — runtime artifacts
.claude/backups/
.claude/cache/
.claude/debug/
.claude/history.jsonl
.claude/agent-activity.jsonl

# ── MCP servers ──────────────────────────────────────────────────────────────
# .mcp.json is committed (team-shared server config)
.mcp.local.json

# ── Environment & secrets ────────────────────────────────────────────────────
.env
.env.local
.env.*.local

# ── Memory — personal files are gitignored, project files are shared ─────────
memory/user_profile.md

# ── OS artifacts ─────────────────────────────────────────────────────────────
.DS_Store
Thumbs.db
Desktop.ini

# ── Node ──────────────────────────────────────────────────────────────────────
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.log

# ── Build output ──────────────────────────────────────────────────────────────
dist/
build/
out/
.next/
.nuxt/
