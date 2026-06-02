#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { main: cliMain } = require("../core/cli");
const { AGENTS, SCOPES, detectAgent, resolveTarget } = require("../core/agent-targets");

const packageRoot = path.resolve(__dirname, "..");
const home = process.env.USERPROFILE || process.env.HOME;
const cwd = process.cwd();
if (!home) {
  console.error("Cannot find USERPROFILE or HOME. Please install manually into an agent skill directory.");
  process.exit(1);
}

const excludedNames = new Set([
  "node_modules",
  "output",
  ".git"
]);

function parseArgs(argv) {
  const options = {
    agent: "auto",
    scope: "global",
    workspace: cwd,
    target: null,
    force: false,
    printPlan: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--print-plan") {
      options.printPlan = true;
      continue;
    }

    if (arg === "--agent" && next) {
      options.agent = next;
      i += 1;
      continue;
    }

    if (arg === "--scope" && next) {
      options.scope = next;
      i += 1;
      continue;
    }

    if (arg === "--workspace" && next) {
      options.workspace = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg === "--target" && next) {
      options.target = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!AGENTS.has(options.agent)) {
    throw new Error(`Unsupported agent: ${options.agent}`);
  }

  if (!SCOPES.has(options.scope)) {
    throw new Error(`Unsupported scope: ${options.scope}`);
  }

  return options;
}

function printHelp() {
  console.log(`
api2img

Install:
  npx api2img
  npx api2img --scope project
  npx api2img --agent claude-code
  npx api2img --print-plan

Configure:
  npx api2img configure --base-url https://your-relay.example.com
  npx api2img configure --update-key
  npx api2img configure --clear
  npx api2img doctor

Generate / Edit:
  npx api2img generate --prompt "生成一张未来城市夜景图"
  npx api2img edit --image input.png --prompt "把背景换成雪山"

Natural language you can tell your agent:
  - 帮我安装 api2img
  - 把 api2img 安装成全局技能
  - 把 api2img 安装到当前项目
  - 帮我配置 api2img 的 base url
  - 帮我更新 api2img 的 api key
  - 用 api2img 生成一张图
  - 用 api2img 修改这张图

Advanced options:
  npx api2img [--agent auto|codex|claude-code|openclaw|hermes|generic] [--scope global|project] [--workspace <path>] [--target <path>] [--force] [--print-plan]
`.trim());
}

function printNextSteps(agent, scope, target) {
  const keyPrompt = "请在当前终端里安全输入你的 api key。";

  console.log("");
  console.log("Agent guidance:");
  console.log("- Installation is complete. Do not stop here.");
  console.log("- Continue by asking the user: 请输入你生成图片的中转 API 地址：");
  console.log("- After the user provides the URL, help save it by using: npx api2img configure --base-url <url>");
  console.log(`- Then tell the user: ${keyPrompt}`);
  console.log("- Store the key by using: npx api2img configure --update-key");
  console.log("- After configuration is complete, continue with image generation or image editing.");
  console.log("- Do not write your own config files or save api2img settings manually.");
  console.log("");
  console.log("Suggested conversation flow:");
  console.log("- 请输入你生成图片的中转 API 地址：");
  console.log(`- ${keyPrompt}`);
  console.log("- 现在可以继续帮你生成图片了。");
  console.log("");
  console.log(`Installed mode: ${agent} (${scope})`);
  console.log(`Installed path: ${target}`);
}

function pathExists(targetPath) {
  try {
    fs.accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      if (excludedNames.has(child)) continue;
      copyRecursive(path.join(source, child), path.join(destination, child));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function installPlan(agent, target) {
  const commonEntries = ["README.md", "README.en.md", "references"];

  if (agent === "codex") {
    return {
      kind: "skill",
      entries: [...commonEntries, "agents", { from: "adapters/codex/SKILL.md", to: "SKILL.md" }],
    };
  }

  if (agent === "openclaw") {
    return {
      kind: "skill",
      entries: [...commonEntries, { from: "adapters/openclaw/SKILL.md", to: "SKILL.md" }],
    };
  }

  if (agent === "hermes") {
    return {
      kind: "skill",
      entries: [...commonEntries, { from: "adapters/hermes/SKILL.md", to: "SKILL.md" }],
    };
  }

  if (agent === "claude-code") {
    return {
      kind: "commands",
      entries: [...commonEntries, { from: "adapters/claude-code/api2img.md", to: "api2img.md" }],
    };
  }

  return {
    kind: "generic",
    entries: [...commonEntries, { from: "adapters/generic/AGENT.md", to: "AGENT.md" }],
  };
}

function copyEntry(entry, target) {
  if (typeof entry === "string") {
    copyRecursive(path.join(packageRoot, entry), path.join(target, entry));
    return;
  }

  copyRecursive(path.join(packageRoot, entry.from), path.join(target, entry.to));
}

function ensureWritableTarget(target, force) {
  if (!pathExists(target)) {
    return;
  }

  if (force) {
    return;
  }

  const children = fs.readdirSync(target);
  if (children.length > 0) {
    throw new Error(`Target already exists and is not empty: ${target}. Re-run with --force to overwrite.`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const delegatedCommands = new Set(["configure", "doctor", "env", "generate", "edit", "help"]);
  if (argv.length > 0 && delegatedCommands.has(argv[0])) {
    const exitCode = await cliMain(argv);
    process.exit(exitCode);
  }

  const options = parseArgs(argv);
  const resolvedAgent = options.agent === "auto" ? detectAgent(options.workspace) : options.agent;
  const target = resolveTarget(resolvedAgent, options.scope, options.workspace, options.target);
  const plan = installPlan(resolvedAgent, target);

  if (options.printPlan) {
    console.log(JSON.stringify({
      agent: resolvedAgent,
      scope: options.scope,
      workspace: options.workspace,
      target,
      kind: plan.kind,
      entries: plan.entries,
    }, null, 2));
    return;
  }

  ensureWritableTarget(target, options.force);
  fs.mkdirSync(target, { recursive: true });

  for (const entry of plan.entries) {
    copyEntry(entry, target);
  }

  console.log("api2img has been installed.");
  printNextSteps(resolvedAgent, options.scope, target);
  if (resolvedAgent === "generic") {
    console.log("If your agent does not auto-discover skills, point it to this directory manually.");
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
