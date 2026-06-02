const fs = require("fs");
const path = require("path");
const { homeDir, workspaceDir } = require("./paths");

const AGENTS = new Set(["auto", "codex", "claude-code", "openclaw", "hermes", "generic"]);
const SCOPES = new Set(["global", "project"]);

function detectAgent(explicitWorkspace) {
  const workspace = workspaceDir(explicitWorkspace);
  const home = homeDir();
  const checks = [
    { agent: "claude-code", paths: [path.join(workspace, ".claude"), path.join(home, ".claude")] },
    { agent: "openclaw", paths: [path.join(workspace, "skills"), path.join(home, ".openclaw")] },
    { agent: "hermes", paths: [path.join(workspace, ".hermes"), path.join(home, ".hermes")] },
    { agent: "codex", paths: [path.join(workspace, ".codex"), path.join(home, ".codex")] },
  ];

  for (const check of checks) {
    if (check.paths.some((item) => fs.existsSync(item))) {
      return check.agent;
    }
  }

  return "generic";
}

function resolveTarget(agent, scope, explicitWorkspace, overrideTarget) {
  if (overrideTarget) {
    return path.resolve(overrideTarget);
  }

  const workspace = workspaceDir(explicitWorkspace);
  const home = homeDir();
  const globalTargets = {
    codex: path.join(home, ".codex", "skills", "api2img"),
    "claude-code": path.join(home, ".claude", "commands", "api2img"),
    openclaw: path.join(home, ".openclaw", "skills", "api2img"),
    hermes: path.join(home, ".hermes", "skills", "api2img"),
    generic: path.join(home, ".agent-skills", "api2img"),
  };
  const projectTargets = {
    codex: path.join(workspace, ".codex", "skills", "api2img"),
    "claude-code": path.join(workspace, ".claude", "commands", "api2img"),
    openclaw: path.join(workspace, "skills", "api2img"),
    hermes: path.join(workspace, ".hermes", "skills", "api2img"),
    generic: path.join(workspace, ".agent-skills", "api2img"),
  };

  return scope === "project" ? projectTargets[agent] : globalTargets[agent];
}

module.exports = {
  AGENTS,
  SCOPES,
  detectAgent,
  resolveTarget,
};
