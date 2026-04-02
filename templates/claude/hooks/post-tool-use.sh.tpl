#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse Hook
# Runs after a tool has completed. Use this to inject reminders or context.
#
# Input:  JSON on stdin  — tool_name, tool_input, tool_response
# Output: {"systemMessage": "..."} to inject a message into Claude's context,
#         or empty output for no effect.
#
# Docs: https://docs.anthropic.com/en/docs/claude-code/hooks
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

INPUT=$(cat)

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
FILE_PATH=$(json_get "tool_input.path")

# ── Emit event to claudeforge agent activity log ──────────────────────────────
if [ -d ".claude" ]; then
  echo "$INPUT" | python3 -c "
import sys, json, time
try:
    d = json.loads(sys.stdin.read())
    tool = d.get('tool_name', '')
    inp  = d.get('tool_input', {})
    detail = ''
    if tool == 'Bash':       detail = inp.get('command', '')[:120]
    elif tool in ('Read', 'Edit', 'Write', 'MultiEdit'):
        detail = inp.get('file_path', inp.get('path', ''))
    elif tool == 'Glob':     detail = inp.get('pattern', '')
    elif tool == 'Grep':     detail = inp.get('pattern', '')
    elif tool == 'Agent':    detail = inp.get('description', '')[:120]
    elif tool == 'WebFetch': detail = inp.get('url', '')[:120]
    elif tool == 'WebSearch':detail = inp.get('query', '')[:120]
    # Capture whether the tool succeeded or errored
    resp = d.get('tool_response', {})
    is_error = resp.get('is_error', False) if isinstance(resp, dict) else False
    event = {
        'ts':      int(time.time() * 1000),
        'type':    'post',
        'tool':    tool,
        'agent':   d.get('agent_name') or d.get('agentName') or 'claude',
        'session': d.get('session_id', ''),
        'detail':  detail,
        'error':   is_error,
    }
    with open('.claude/agent-activity.jsonl', 'a') as f:
        f.write(json.dumps(event) + '\n')
except:
    pass
" 2>/dev/null || true
fi

# ── Reminder: run tests after editing test files ──────────────────────────────
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "MultiEdit" ]]; then
  if echo "$FILE_PATH" | grep -qiE '\.(test|spec)\.[jt]sx?$|_test\.go$|test_.*\.py$|.*_spec\.rb$'; then
    echo '{"systemMessage":"Test file edited. Consider running the test suite to verify the changes work as expected."}'
    exit 0
  fi
fi

# ── Default: no effect ────────────────────────────────────────────────────────
exit 0
