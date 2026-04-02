'use strict';

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { execSync } = require('child_process');
const logger  = require('../logger');

const DEFAULT_PORT = 7337;

// ── Tool colour + icon map ────────────────────────────────────────────────────
const TOOL_META = {
  Bash:       { color: '#fb923c', icon: '⚡' },
  Read:       { color: '#38bdf8', icon: '📖' },
  Edit:       { color: '#fbbf24', icon: '✏️'  },
  Write:      { color: '#4ade80', icon: '💾' },
  MultiEdit:  { color: '#fbbf24', icon: '✏️'  },
  Glob:       { color: '#a78bfa', icon: '🔍' },
  Grep:       { color: '#a78bfa', icon: '🔎' },
  Agent:      { color: '#f472b6', icon: '🤖' },
  WebFetch:   { color: '#34d399', icon: '🌐' },
  WebSearch:  { color: '#34d399', icon: '🌐' },
  TodoWrite:  { color: '#94a3b8', icon: '📝' },
  TaskCreate: { color: '#94a3b8', icon: '📋' },
};

// ── Scan configured agents from .claude/agents/ ───────────────────────────────
function loadAgents(dir) {
  const agentsDir = path.join(dir, '.claude', 'agents');
  const agents = [{ name: 'claude', label: 'Claude (main)', color: '#6c63ff' }];
  if (!fs.existsSync(agentsDir)) return agents;
  for (const f of fs.readdirSync(agentsDir)) {
    if (!f.endsWith('.md')) continue;
    const name = f.replace(/\.md$/, '');
    let color = '#a78bfa';
    try {
      const content = fs.readFileSync(path.join(agentsDir, f), 'utf8');
      const m = content.match(/color[:\s]+['"]?([#\w]+)/i);
      if (m) color = m[1];
    } catch (_) {}
    agents.push({ name, label: name, color });
  }
  return agents;
}

// ── Read last N lines of JSONL ────────────────────────────────────────────────
function readRecentEvents(logFile, n = 200) {
  if (!fs.existsSync(logFile)) return [];
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ── Dashboard HTML (self-contained) ──────────────────────────────────────────
function dashboardHTML(agents) {
  const agentsJson = JSON.stringify(agents);
  const toolMetaJson = JSON.stringify(TOOL_META);

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>claudeforge — Agent Activity</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0a0b0f;--bg1:#111318;--bg2:#161820;--border:rgba(255,255,255,0.07);
      --accent:#6c63ff;--accent2:#a78bfa;--green:#4ade80;--yellow:#fbbf24;
      --red:#f87171;--blue:#38bdf8;--text:#e8e9f0;--dim:#9ca3af;--muted:#4b5563;
    }
    html,body{height:100%;overflow:hidden}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);display:flex;flex-direction:column}

    /* ── Top bar ── */
    header{
      display:flex;align-items:center;gap:1rem;padding:.75rem 1.25rem;
      background:var(--bg1);border-bottom:1px solid var(--border);flex-shrink:0;
    }
    .logo{font-family:'JetBrains Mono',monospace;font-size:.95rem;font-weight:700;color:var(--accent2)}
    .logo span{color:var(--muted)}
    .conn-dot{width:8px;height:8px;border-radius:50%;background:var(--muted);transition:background .3s}
    .conn-dot.live{background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s ease infinite}
    .conn-label{font-size:.78rem;color:var(--dim)}
    .header-right{margin-left:auto;display:flex;align-items:center;gap:.8rem}
    .clear-btn{
      background:transparent;border:1px solid var(--border);color:var(--dim);
      padding:.3rem .75rem;border-radius:6px;font-size:.75rem;cursor:pointer;
      transition:all .2s;font-family:'Inter',sans-serif;
    }
    .clear-btn:hover{border-color:rgba(255,255,255,.2);color:var(--text)}
    .event-count{font-size:.75rem;color:var(--muted);font-family:'JetBrains Mono',monospace}

    /* ── Layout ── */
    main{display:grid;grid-template-columns:260px 1fr 320px;flex:1;overflow:hidden;gap:0}

    /* ── Agents sidebar ── */
    .agents-panel{
      border-right:1px solid var(--border);overflow-y:auto;padding:1rem;
      display:flex;flex-direction:column;gap:.5rem;
    }
    .panel-title{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:.25rem 0 .6rem}
    .agent-card{
      background:var(--bg2);border:1px solid var(--border);border-radius:10px;
      padding:.85rem 1rem;transition:border-color .25s,box-shadow .25s;
      cursor:default;
    }
    .agent-card.active{
      border-color:rgba(108,99,255,.45);
      box-shadow:0 0 18px rgba(108,99,255,.18);
    }
    .agent-card.error{ border-color:rgba(248,113,113,.45); }
    .agent-header{display:flex;align-items:center;gap:.6rem}
    .agent-status{
      width:9px;height:9px;border-radius:50%;background:var(--muted);flex-shrink:0;
      transition:background .3s,box-shadow .3s;
    }
    .agent-card.active .agent-status{background:var(--green);box-shadow:0 0 7px var(--green);animation:pulse 1.4s ease infinite}
    .agent-card.error  .agent-status{background:var(--red);box-shadow:0 0 7px var(--red)}
    .agent-name{font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .agent-tool{
      font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--dim);
      margin-top:.35rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .agent-counts{display:flex;gap:.5rem;margin-top:.5rem}
    .agent-count{font-size:.68rem;padding:.15rem .45rem;border-radius:4px;background:rgba(255,255,255,.05);color:var(--dim)}

    /* ── Active task panel (center) ── */
    .active-panel{
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:2rem;overflow:hidden;position:relative;
    }
    .active-panel::before{
      content:'';position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(ellipse at center,rgba(108,99,255,.06) 0%,transparent 70%);
    }
    .idle-msg{text-align:center;color:var(--muted)}
    .idle-msg .idle-icon{font-size:3rem;margin-bottom:1rem;opacity:.4}
    .idle-msg p{font-size:.9rem}

    .task-card{
      background:var(--bg1);border:1px solid var(--border);border-radius:16px;
      padding:2rem;width:100%;max-width:560px;
      box-shadow:0 20px 60px rgba(0,0,0,.5);
      animation:taskAppear .3s ease both;
    }
    @keyframes taskAppear{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
    .task-top{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem}
    .task-tool-icon{
      width:48px;height:48px;border-radius:12px;
      display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;
    }
    .task-tool-name{font-weight:800;font-size:1.2rem}
    .task-agent-label{font-size:.78rem;color:var(--dim);margin-top:.2rem}
    .task-spinner{
      width:10px;height:10px;border-radius:50%;background:var(--green);
      margin-left:auto;animation:pulse 1.2s ease infinite;
    }
    .task-detail{
      background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;
      padding:.8rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.78rem;
      color:var(--accent2);word-break:break-all;line-height:1.6;min-height:44px;
    }
    .task-meta{display:flex;gap:1rem;margin-top:1rem}
    .task-meta-item{font-size:.75rem;color:var(--dim)}
    .task-meta-item strong{color:var(--text)}

    /* Tool flow arrows */
    .flow-dots{display:flex;gap:.4rem;align-items:center;justify-content:center;margin-top:1.5rem}
    .flow-dot{
      width:6px;height:6px;border-radius:50%;background:var(--border);
      animation:flowPulse 1.5s ease infinite;
    }
    .flow-dot:nth-child(2){animation-delay:.2s}
    .flow-dot:nth-child(3){animation-delay:.4s}
    @keyframes flowPulse{0%,100%{background:var(--border)}50%{background:var(--accent2)}}

    /* ── Event feed ── */
    .feed-panel{
      border-left:1px solid var(--border);overflow-y:auto;padding:.75rem;
      display:flex;flex-direction:column;gap:.35rem;
    }
    .feed-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:.25rem .4rem .7rem;flex-shrink:0;
    }
    .feed-header-title{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}

    .feed-item{
      background:var(--bg2);border:1px solid var(--border);border-radius:8px;
      padding:.6rem .8rem;display:flex;gap:.6rem;align-items:flex-start;
      animation:feedSlide .25s ease both;flex-shrink:0;
    }
    @keyframes feedSlide{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
    .feed-item.post{opacity:.7}
    .feed-item.error{border-color:rgba(248,113,113,.3)}
    .feed-icon{font-size:.9rem;flex-shrink:0;margin-top:.05rem}
    .feed-body{flex:1;min-width:0}
    .feed-top{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
    .feed-tool{
      font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:600;
      padding:.15rem .45rem;border-radius:4px;
    }
    .feed-agent{font-size:.7rem;color:var(--dim)}
    .feed-time{font-size:.67rem;color:var(--muted);margin-left:auto;flex-shrink:0}
    .feed-detail{
      font-size:.72rem;color:var(--dim);margin-top:.3rem;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .feed-type-dot{
      width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:.35rem;
    }

    /* ── Animations ── */
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

    /* ── Scrollbars ── */
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--muted);border-radius:2px}

    /* ── Responsive ── */
    @media(max-width:900px){
      main{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}
      .agents-panel{border-right:none;border-bottom:1px solid var(--border);
        flex-direction:row;overflow-x:auto;overflow-y:hidden;gap:.5rem;padding:.6rem}
      .panel-title{display:none}
      html,body{overflow:auto}
      main{overflow:visible}
    }
  </style>
</head>
<body>

<header>
  <div class="logo">claudeforge<span>.watch</span></div>
  <div class="conn-dot" id="connDot"></div>
  <span class="conn-label" id="connLabel">connecting…</span>
  <div class="header-right">
    <span class="event-count" id="eventCount">0 events</span>
    <button class="clear-btn" onclick="clearLog()">Clear</button>
  </div>
</header>

<main>
  <!-- Agents sidebar -->
  <div class="agents-panel" id="agentsPanel">
    <div class="panel-title">Agents</div>
    <!-- populated by JS -->
  </div>

  <!-- Active task -->
  <div class="active-panel" id="activePanel">
    <div class="idle-msg" id="idleMsg">
      <div class="idle-icon">🤖</div>
      <p>Waiting for agent activity…</p>
      <p style="margin-top:.5rem;font-size:.8rem;color:#4b5563">Run a slash command in Claude Code to see live updates</p>
    </div>
  </div>

  <!-- Event feed -->
  <div class="feed-panel" id="feedPanel">
    <div class="feed-header">
      <span class="feed-header-title">Live Feed</span>
    </div>
    <!-- events appended here -->
  </div>
</main>

<script>
  const AGENTS    = ${agentsJson};
  const TOOL_META = ${toolMetaJson};

  // ── Agent state ──────────────────────────────────────────────────────────────
  const agentState = {};   // name → { card, toolEl, countEl, calls:0, errors:0 }
  let totalEvents = 0;
  let currentTask = null;  // the active pre-event being shown

  // ── Render agent cards ───────────────────────────────────────────────────────
  const panel = document.getElementById('agentsPanel');
  AGENTS.forEach(agent => {
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.id = 'agent-' + agent.name;
    card.innerHTML = \`
      <div class="agent-header">
        <div class="agent-status"></div>
        <div class="agent-name">\${agent.label}</div>
      </div>
      <div class="agent-tool" id="atool-\${agent.name}">idle</div>
      <div class="agent-counts">
        <span class="agent-count" id="acalls-\${agent.name}">0 calls</span>
        <span class="agent-count" id="aerr-\${agent.name}" style="display:none;color:var(--red)">0 err</span>
      </div>\`;
    panel.appendChild(card);
    agentState[agent.name] = {
      card,
      toolEl:  card.querySelector('#atool-' + agent.name),
      callsEl: card.querySelector('#acalls-' + agent.name),
      errEl:   card.querySelector('#aerr-' + agent.name),
      calls: 0, errors: 0, color: agent.color,
    };
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  function toolMeta(tool) {
    return TOOL_META[tool] || { color: '#94a3b8', icon: '🔧' };
  }

  function getOrCreateAgent(name) {
    if (agentState[name]) return agentState[name];
    // Unknown agent — create card on the fly
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.id = 'agent-' + name;
    card.innerHTML = \`
      <div class="agent-header">
        <div class="agent-status"></div>
        <div class="agent-name">\${name}</div>
      </div>
      <div class="agent-tool" id="atool-\${name}">idle</div>
      <div class="agent-counts">
        <span class="agent-count" id="acalls-\${name}">0 calls</span>
        <span class="agent-count" id="aerr-\${name}" style="display:none;color:var(--red)">0 err</span>
      </div>\`;
    panel.appendChild(card);
    agentState[name] = {
      card,
      toolEl:  card.querySelector('#atool-' + name),
      callsEl: card.querySelector('#acalls-' + name),
      errEl:   card.querySelector('#aerr-' + name),
      calls: 0, errors: 0, color: '#a78bfa',
    };
    return agentState[name];
  }

  // ── Process one event ─────────────────────────────────────────────────────────
  function processEvent(ev, prepend = false) {
    totalEvents++;
    document.getElementById('eventCount').textContent = totalEvents + ' events';

    const state = getOrCreateAgent(ev.agent);
    const meta  = toolMeta(ev.tool);

    if (ev.type === 'pre') {
      // Activate agent card
      state.calls++;
      state.callsEl.textContent = state.calls + ' calls';
      state.card.classList.add('active');
      state.card.classList.remove('error');
      state.toolEl.textContent = meta.icon + ' ' + ev.tool;

      // Show active task card
      showActiveTask(ev, meta, state);
    }

    if (ev.type === 'post') {
      // Deactivate agent
      state.card.classList.remove('active');
      state.toolEl.textContent = 'idle';
      if (ev.error) {
        state.errors++;
        state.errEl.textContent = state.errors + ' err';
        state.errEl.style.display = '';
        state.card.classList.add('error');
        setTimeout(() => state.card.classList.remove('error'), 3000);
      }
      // Clear active task if it belongs to this agent+tool
      if (currentTask && currentTask.agent === ev.agent && currentTask.tool === ev.tool) {
        clearActiveTask();
      }
    }

    // Append feed item
    appendFeedItem(ev, meta, prepend);
  }

  function showActiveTask(ev, meta, state) {
    currentTask = ev;
    const panel = document.getElementById('activePanel');
    document.getElementById('idleMsg')?.remove();

    let card = document.getElementById('taskCard');
    if (!card) {
      card = document.createElement('div');
      card.className = 'task-card';
      card.id = 'taskCard';
      panel.appendChild(card);
    }
    card.innerHTML = \`
      <div class="task-top">
        <div class="task-tool-icon" style="background:\${meta.color}22;border:1px solid \${meta.color}44">\${meta.icon}</div>
        <div>
          <div class="task-tool-name" style="color:\${meta.color}">\${ev.tool}</div>
          <div class="task-agent-label">via <strong style="color:\${state.color}">\${ev.agent}</strong></div>
        </div>
        <div class="task-spinner"></div>
      </div>
      <div class="task-detail">\${ev.detail || '—'}</div>
      <div class="task-meta">
        <div class="task-meta-item"><strong>\${fmtTime(ev.ts)}</strong> started</div>
        <div class="task-meta-item" id="taskSession">session <strong>\${(ev.session || '').slice(0,8) || '—'}</strong></div>
      </div>
      <div class="flow-dots">
        <div class="flow-dot"></div>
        <div class="flow-dot"></div>
        <div class="flow-dot"></div>
      </div>\`;
  }

  function clearActiveTask() {
    currentTask = null;
    const card = document.getElementById('taskCard');
    if (card) card.remove();
    const panel = document.getElementById('activePanel');
    if (!document.getElementById('idleMsg')) {
      const idle = document.createElement('div');
      idle.className = 'idle-msg';
      idle.id = 'idleMsg';
      idle.innerHTML = \`<div class="idle-icon">✅</div><p>Task completed</p><p style="margin-top:.5rem;font-size:.8rem;color:#4b5563">Waiting for next activity…</p>\`;
      panel.appendChild(idle);
    }
  }

  function appendFeedItem(ev, meta, prepend) {
    const feed = document.getElementById('feedPanel');
    const item = document.createElement('div');
    const isPost = ev.type === 'post';
    item.className = 'feed-item' + (isPost ? ' post' : '') + (ev.error ? ' error' : '');

    const dotColor = isPost ? (ev.error ? 'var(--red)' : 'var(--muted)') : 'var(--green)';
    item.innerHTML = \`
      <div class="feed-type-dot" style="background:\${dotColor}"></div>
      <div class="feed-body">
        <div class="feed-top">
          <span class="feed-tool" style="background:\${meta.color}22;color:\${meta.color}">\${meta.icon} \${ev.tool}</span>
          <span class="feed-agent">\${ev.agent}</span>
          <span class="feed-time">\${fmtTime(ev.ts)}</span>
        </div>
        \${ev.detail ? \`<div class="feed-detail" title="\${ev.detail}">\${ev.detail}</div>\` : ''}
      </div>\`;

    const header = feed.querySelector('.feed-header');
    if (prepend && header) {
      header.insertAdjacentElement('afterend', item);
    } else {
      feed.appendChild(item);
    }

    // Keep max 120 items
    const items = feed.querySelectorAll('.feed-item');
    if (items.length > 120) items[items.length - 1].remove();

    // Auto-scroll to top on new events (newest first)
    if (!prepend) feed.scrollTop = 0;
  }

  // ── SSE connection ────────────────────────────────────────────────────────────
  const dot   = document.getElementById('connDot');
  const label = document.getElementById('connLabel');

  function connect() {
    const es = new EventSource('/events');

    es.addEventListener('history', e => {
      const events = JSON.parse(e.data);
      // Replay historical events (oldest first into feed, newest at top)
      events.forEach(ev => processEvent(ev, false));
    });

    es.addEventListener('event', e => {
      processEvent(JSON.parse(e.data), false);
      // Scroll feed to top for newest
      document.getElementById('feedPanel').scrollTop = 0;
    });

    es.onopen = () => {
      dot.className = 'conn-dot live';
      label.textContent = 'live';
    };

    es.onerror = () => {
      dot.className = 'conn-dot';
      label.textContent = 'reconnecting…';
      es.close();
      setTimeout(connect, 2000);
    };
  }
  connect();

  // ── Clear log ─────────────────────────────────────────────────────────────────
  async function clearLog() {
    await fetch('/clear', { method: 'POST' });
    totalEvents = 0;
    document.getElementById('eventCount').textContent = '0 events';
    document.getElementById('feedPanel').querySelectorAll('.feed-item').forEach(el => el.remove());
    Object.values(agentState).forEach(s => {
      s.card.classList.remove('active','error');
      s.toolEl.textContent = 'idle';
      s.calls = 0; s.errors = 0;
      s.callsEl.textContent = '0 calls';
      s.errEl.style.display = 'none';
    });
    document.getElementById('taskCard')?.remove();
    if (!document.getElementById('idleMsg')) {
      const idle = document.createElement('div');
      idle.className = 'idle-msg'; idle.id = 'idleMsg';
      idle.innerHTML = '<div class="idle-icon">🤖</div><p>Waiting for agent activity…</p>';
      document.getElementById('activePanel').appendChild(idle);
    }
    currentTask = null;
  }
</script>
</body>
</html>`;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
async function watchCommand(opts) {
  const dir     = path.resolve(opts.dir || '.');
  const logFile = path.join(dir, '.claude', 'agent-activity.jsonl');
  const port    = opts.port ? parseInt(opts.port, 10) : DEFAULT_PORT;

  if (!fs.existsSync(path.join(dir, '.claude'))) {
    logger.error('No .claude/ directory found. Run `claudeforge init` first.');
    process.exit(1);
  }

  // Ensure log file exists
  if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '');

  const agents = loadAgents(dir);
  const html   = dashboardHTML(agents);

  // Active SSE clients
  const clients = new Set();

  // Tail: track file position
  let filePos = fs.statSync(logFile).size;

  fs.watch(logFile, () => {
    try {
      const stat = fs.statSync(logFile);
      if (stat.size < filePos) { filePos = 0; } // file was cleared
      if (stat.size === filePos) return;
      const buf = Buffer.alloc(stat.size - filePos);
      const fd  = fs.openSync(logFile, 'r');
      fs.readSync(fd, buf, 0, buf.length, filePos);
      fs.closeSync(fd);
      filePos = stat.size;

      const lines = buf.toString('utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line);
          const msg = `event: event\ndata: ${JSON.stringify(ev)}\n\n`;
          for (const res of clients) res.write(msg);
        } catch (_) {}
      }
    } catch (_) {}
  });

  const server = http.createServer((req, res) => {
    // SSE endpoint
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(':ok\n\n');

      // Send history
      const history = readRecentEvents(logFile, 150);
      if (history.length) {
        res.write(`event: history\ndata: ${JSON.stringify(history)}\n\n`);
      }

      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // Clear endpoint
    if (req.url === '/clear' && req.method === 'POST') {
      fs.writeFileSync(logFile, '');
      filePos = 0;
      res.writeHead(200); res.end();
      return;
    }

    // Agents JSON
    if (req.url === '/agents') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loadAgents(dir)));
      return;
    }

    // Dashboard
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    logger.success(`Agent dashboard running at ${url}`);
    logger.hint(`Activity log: .claude/agent-activity.jsonl`);
    logger.hint(`Press Ctrl+C to stop`);

    // Open browser
    if (!opts.noBrowser) {
      try {
        const open = process.platform === 'darwin' ? 'open'
                   : process.platform === 'win32'  ? 'start'
                   : 'xdg-open';
        execSync(`${open} ${url}`, { stdio: 'ignore' });
      } catch (_) {}
    }
  });

  process.on('SIGINT', () => { server.close(); process.exit(0); });
}

module.exports = watchCommand;
