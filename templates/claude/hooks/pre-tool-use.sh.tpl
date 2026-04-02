#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse Hook
# Runs before every tool execution. Use this to block or warn on dangerous ops.
#
# Input:  JSON on stdin  — describes the tool call (tool_name, tool_input, ...)
# Output: JSON on stdout — {"decision": "block"|"warn", "reason": "..."} to
#                          intercept, or empty output to allow the call.
#
# Exit codes: 0 = allow (unless decision=block), non-zero = block
#
# Docs: https://docs.anthropic.com/en/docs/claude-code/hooks
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

INPUT=$(cat)

# ── Helper: extract JSON field via python3 (available on macOS/Linux) ─────────
json_get() {
  python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    keys = '$1'.split('.')
    v = d
    for k in keys:
        v = v[k] if isinstance(v, dict) else ''
    print(v if v is not None else '')
except:
    print('')
" <<< "$INPUT"
}

TOOL_NAME=$(json_get "tool_name")
COMMAND=$(json_get "tool_input.command")
FILE_PATH=$(json_get "tool_input.path")

# ── Emit event to claudeforge agent activity log ──────────────────────────────
if [ -d ".claude" ]; then
  echo "$INPUT" | python3 -c "
import sys, json, time
try:
    d = json.loads(sys.stdin.read())
    tool = d.get('tool_name', '')
    inp  = d.get('tool_input', {})
    # Build a human-readable detail string based on tool type
    detail = ''
    if tool == 'Bash':       detail = inp.get('command', '')[:120]
    elif tool in ('Read', 'Edit', 'Write', 'MultiEdit'):
        detail = inp.get('file_path', inp.get('path', ''))
    elif tool == 'Glob':     detail = inp.get('pattern', '')
    elif tool == 'Grep':     detail = inp.get('pattern', '')
    elif tool == 'Agent':    detail = inp.get('description', '')[:120]
    elif tool == 'WebFetch': detail = inp.get('url', '')[:120]
    elif tool == 'WebSearch':detail = inp.get('query', '')[:120]
    event = {
        'ts':      int(time.time() * 1000),
        'type':    'pre',
        'tool':    tool,
        'agent':   d.get('agent_name') or d.get('agentName') or 'claude',
        'session': d.get('session_id', ''),
        'detail':  detail,
    }
    with open('.claude/agent-activity.jsonl', 'a') as f:
        f.write(json.dumps(event) + '\n')
except:
    pass
" 2>/dev/null || true
fi

# ── Rule 1: Block rm -rf on paths outside /tmp ────────────────────────────────
if [[ "$TOOL_NAME" == "Bash" ]]; then
  if echo "$COMMAND" | grep -qE 'rm\s+-[rf]+\s+/' && ! echo "$COMMAND" | grep -qE 'rm\s+-[rf]+\s+/tmp'; then
    echo '{"decision":"block","reason":"Blocked: rm -rf on an absolute path outside /tmp. Verify the target and use a safer, more targeted delete."}'
    exit 0
  fi
fi

# ── Rule 2: Warn on edits to sensitive files ──────────────────────────────────
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "MultiEdit" ]]; then
  if echo "$FILE_PATH" | grep -qiE '\.env$|credentials|secrets|\.pem$|\.key$|id_rsa|\.p12$'; then
    echo '{"decision":"warn","reason":"Warning: Editing a sensitive file. Ensure no secrets are hardcoded and this file is listed in .gitignore."}'
    exit 0
  fi
fi

# ── Rule 3: Block piped shell execution (curl | bash, wget | sh, etc.) ────────
if [[ "$TOOL_NAME" == "Bash" ]]; then
  if echo "$COMMAND" | grep -qE '(curl|wget)\s+.*\|\s*(bash|sh|zsh)'; then
    echo '{"decision":"block","reason":"Blocked: piped remote script execution (curl|bash pattern). Download the script first, inspect it, then run it explicitly."}'
    exit 0
  fi
fi

# ── Default: allow ────────────────────────────────────────────────────────────
exit 0
