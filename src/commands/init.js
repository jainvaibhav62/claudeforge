'use strict';

const path = require('path');
const scaffolder = require('../scaffolder');
const logger = require('../logger');

/**
 * Static manifest — defines every file and directory to scaffold.
 * Ordered so parent directories appear before their children.
 *
 * type: 'dir'  — create directory (no template src needed)
 * type: 'file' — copy template src → dest
 */
const MANIFEST = [
  // ── Directories ──────────────────────────────────────────────────────────
  { type: 'dir', dest: '.claude' },
  { type: 'dir', dest: '.claude/agents' },
  { type: 'dir', dest: '.claude/commands' },
  { type: 'dir', dest: '.claude/hooks' },
  { type: 'dir', dest: '.claude/rules' },
  { type: 'dir', dest: '.claude/skills' },
  { type: 'dir', dest: '.claude/skills/project-conventions' },
  { type: 'dir', dest: 'memory' },

  // ── .claude/ root files ───────────────────────────────────────────────────
  { type: 'file', src: 'claude/README.md.tpl',           dest: '.claude/README.md' },
  { type: 'file', src: 'claude/settings.json.tpl',       dest: '.claude/settings.json' },
  { type: 'file', src: 'claude/settings.local.json.tpl', dest: '.claude/settings.local.json' },

  // ── .claude/agents/ ───────────────────────────────────────────────────────
  { type: 'file', src: 'claude/agents/code-reviewer.md.tpl',  dest: '.claude/agents/code-reviewer.md' },

  // ── .claude/commands/ ─────────────────────────────────────────────────────
  // Core workflow commands
  { type: 'file', src: 'claude/commands/commit.md.tpl',          dest: '.claude/commands/commit.md' },
  { type: 'file', src: 'claude/commands/review-pr.md.tpl',       dest: '.claude/commands/review-pr.md' },
  // AI setup & maintenance commands
  { type: 'file', src: 'claude/commands/setup-project.md.tpl',   dest: '.claude/commands/setup-project.md' },
  { type: 'file', src: 'claude/commands/analyze-project.md.tpl', dest: '.claude/commands/analyze-project.md' },
  { type: 'file', src: 'claude/commands/memory-sync.md.tpl',     dest: '.claude/commands/memory-sync.md' },
  { type: 'file', src: 'claude/commands/project-health.md.tpl',  dest: '.claude/commands/project-health.md' },
  // Developer productivity commands
  { type: 'file', src: 'claude/commands/standup.md.tpl',         dest: '.claude/commands/standup.md' },
  { type: 'file', src: 'claude/commands/explain-codebase.md.tpl',dest: '.claude/commands/explain-codebase.md' },
  { type: 'file', src: 'claude/commands/fix-issue.md.tpl',       dest: '.claude/commands/fix-issue.md' },
  { type: 'file', src: 'claude/commands/scaffold-structure.md.tpl', dest: '.claude/commands/scaffold-structure.md' },

  // ── .claude/hooks/ ────────────────────────────────────────────────────────
  { type: 'file', src: 'claude/hooks/pre-tool-use.sh.tpl',    dest: '.claude/hooks/pre-tool-use.sh' },
  { type: 'file', src: 'claude/hooks/post-tool-use.sh.tpl',   dest: '.claude/hooks/post-tool-use.sh' },

  // ── .claude/rules/ ────────────────────────────────────────────────────────
  { type: 'file', src: 'claude/rules/no-sensitive-files.md.tpl', dest: '.claude/rules/no-sensitive-files.md' },

  // ── .claude/skills/ ───────────────────────────────────────────────────────
  { type: 'file', src: 'claude/skills/project-conventions/SKILL.md.tpl', dest: '.claude/skills/project-conventions/SKILL.md' },

  // ── memory/ ───────────────────────────────────────────────────────────────
  { type: 'file', src: 'memory/MEMORY.md.tpl',                 dest: 'memory/MEMORY.md' },
  { type: 'file', src: 'memory/user_profile.md.tpl',           dest: 'memory/user_profile.md' },
  { type: 'file', src: 'memory/feedback_communication.md.tpl', dest: 'memory/feedback_communication.md' },
  { type: 'file', src: 'memory/project_ai_workflow.md.tpl',    dest: 'memory/project_ai_workflow.md' },

  // ── Project root files ────────────────────────────────────────────────────
  { type: 'file', src: 'CLAUDE.md.tpl',       dest: 'CLAUDE.md' },
  { type: 'file', src: 'CLAUDE.local.md.tpl', dest: 'CLAUDE.local.md' },
  { type: 'file', src: '.env.example.tpl',    dest: '.env.example' },
  { type: 'file', src: 'mcp.json.tpl',        dest: '.mcp.json' },
  { type: 'file', src: '.gitignore.tpl',      dest: '.gitignore' },
];

async function init(options) {
  const targetDir = path.resolve(options.dir || process.cwd());
  const { force, dryRun } = options;

  logger.banner(dryRun);
  logger.info(`Target: ${targetDir}`);
  console.log('');

  const stats = { created: 0, skipped: 0, overwritten: 0 };
  const templatesDir = path.join(__dirname, '../../templates');

  for (const entry of MANIFEST) {
    const destAbs = path.join(targetDir, entry.dest);

    if (entry.type === 'dir') {
      await scaffolder.ensureDir(destAbs, dryRun);
      logger.dirResult(entry.dest, dryRun);
      continue;
    }

    // type === 'file'
    const srcAbs = path.join(templatesDir, entry.src);
    const result = await scaffolder.writeFile(srcAbs, destAbs, { force, dryRun });
    stats[result]++;
    logger.fileResult(result, entry.dest, dryRun);
  }

  // Make hook scripts executable on Unix systems
  if (!dryRun) {
    await scaffolder.chmod(path.join(targetDir, '.claude/hooks/pre-tool-use.sh'), 0o755);
    await scaffolder.chmod(path.join(targetDir, '.claude/hooks/post-tool-use.sh'), 0o755);
  }

  logger.summary(stats, dryRun);
}

module.exports = init;
